////////////////////////////////
// Classes and constants
////////////////////////////////

/** Categories and Ids */
const categoryIds = {
    "Computers & Tablets": "20001",
    "Best Buy Mobile": "20006",
    "Office Supplies & Ink": "30957",
    "TV & Home Theatre": "20003",
    "Audio": "659699",
    "Cameras, Camcorders & Drones": "20005",
    "Car Electronics and GPS": "20004",
    "Appliances": "26517",
    "Smart Home": "30438",
    "Home Living": "homegardentools",
    "Baby & Maternity": "881392",
    "Video Games": "26516",
    "Wearable Technology": "34444",
    "Health & Fitness": "882185",
    "Sports, Recreation & Transportation": "sportsrecreation",
    "Movies & Music": "20002",
    "Musical Instruments & Equipment": "20343",
    "Toys, Games & Education": "21361",
    "Beauty": "882187",
    "Personal Care": "882186",
    "Travel, Luggage & Bags": "31698",
    "Fashion, Watches & Jewelry": "10159983",
    "Gift Cards": "blta5578c9ddd209cd8"
};
/** Useful links */
const links = {
    /** Random Test API */
    testAPI: "https://get.geojs.io/v1/ip/country.json?ip=8.8.8.8",
    /** Should return a full object that has all info about the Best Buy menu headers and stuff */
    headers: "https://www.bestbuy.ca/api/merch/v2/menus/header/?lang=en-ca",
    /** Should return an object full of category info */
    categories: "https://www.bestbuy.ca/api/merch/v2/menus/header/blted928bb7b8e6c7f8-g1?lang=en-ca",
    staffPriceBase: "https://staffprice-app-hr-staffprice-prod.apps.prod-ocp-corp.ca.bestbuy.com/bizdm/api/staffprice/skus/",
    staffPrice(skus = [""]) { return this.staffPriceBase + skus.join(","); },
    // https://stackoverflow.com/questions/1714786/query-string-encoding-of-a-javascript-object
    search(id, pageNumber, query = "") { return (
        `https://www.bestbuy.ca/api/v2/json/search?`
        + `categoryid=${encodeURIComponent(id)}`
        + `&currentRegion=BC`
        + `&lang=en-CA` 
        + `&page=${pageNumber}`
        + `&pageSize=100`
        + `&path=soldandshippedby0enrchstring%3ABest%20Buy`
        + `&query=${encodeURIComponent(query)}`
        + `&sortBy=price`
        + `&sortDir=desc`
    )}
};

class Table {

    // data = [exItemObject];
    static data = [];
    static curSortIndex = 0;
    static tBody;
    static tHead;

    static construct(table = new HTMLTableElement()) {
        this.tBody = table.tBodies.item(0);
        this.tHead = table.tHead;
        this.data = [];
        this.addHeaders();
    }

    static render(page) {
        this.clearBody();

        let totalPages = Math.ceil(this.data.length / 100);
        if (page > totalPages) return console.error("Invalid page number: " + page);
        if (totalPages == 0) return console.log("No data to load");

        Pagination.render(page, totalPages);

        // Render the first 100 elements of this page
        let elementsOnThisPage = (this.data.length < page * 100) ? this.data.length - (page - 1) * 100 : 100;
        let startIndex = (page - 1) * 100;
        let itemsOnThisPage = this.data.slice(startIndex, startIndex + elementsOnThisPage);
        itemsOnThisPage.forEach(item => this.tBody.append(this.formatRow(item)));
    }


    static clearAll() {
        this.data = [];
        this.curSortIndex = 0;
        this.clearBody();
    }

    static clearBody() {
        this.tBody.innerHTML = "";
    }

    static formatRow(item) {
        let row = document.createElement("tr");
        // Image cell
        let imageCell = document.createElement("td");
        imageCell.style = "padding:0;";
        let image = document.createElement("img");
        image.src = item.img;
        imageCell.append(image);
        //  Name cell
        let nameCell = document.createElement("td");
        let nameLink = document.createElement("a");
        nameLink.href = item.url;
        nameLink.target = "_blank";
        nameLink.innerText = trimName(item.name, 80);
        nameCell.append(nameLink);
        // Regular price cell
        let regularPriceCell = document.createElement("td");
        regularPriceCell.innerText = toCAD(item.regularPrice);
        // Staff price cell
        let staffPriceCell = document.createElement("td");
        staffPriceCell.innerText = item.staffPrice || "N/A";
        // Percent discount cell
        let percentDiscountCell = document.createElement("td");
        let pDisc = percentDiscountFormat(item.regularPrice, item.staffPrice);
        percentDiscountCell.innerText = item.staffPrice ? pDisc : "N/A";
        // Flat discount cell
        let flatDiscountCell = document.createElement("td");
        flatDiscountCell.innerText = item.staffPrice ? toCAD(item.regularPrice - item.staffPrice) : "N/A";
        // Delete button
        let deleteButtonCell = document.createElement("td");
        let deleteButton = document.createElement("button");
        deleteButtonCell.append(deleteButton);
        deleteButton.innerText = "X";
        deleteButton.className = "btn btn-danger";
        deleteButton.onclick = (ev) => { this.tBody.removeChild(ev.target.parentNode.parentNode) };

        row.append(
            imageCell,
            nameCell,
            regularPriceCell,
            staffPriceCell,
            percentDiscountCell,
            flatDiscountCell,
            deleteButtonCell
        );

        return row;
    }

    static sort(index) {
        // Nothing needs to be sorted
        if (index == this.curSortIndex) return;
        console.log("Sorting table by index: " + index);
        // Regular Price
        if (index == 2) {
            this.curSortIndex = 2;
            this.data.sort((a, b) => b.regularPrice - a.regularPrice);
        }
        // Staff Price
        else if (index == 3) {
            this.curSortIndex = 3;
            this.data.sort((a, b) => b.staffPrice - a.staffPrice);
        }
        // Discount (%)
        else if (index == 4) {
            this.curSortIndex = 4;
            this.data.sort((a, b) => percentDiscount(b.regularPrice, b.staffPrice) - percentDiscount(a.regularPrice, a.staffPrice));
        }
        // Discount ($)
        else if (index == 5) {
            this.curSortIndex = 5;
            this.data.sort((a, b) => (b.regularPrice - b.staffPrice) - (a.regularPrice - a.staffPrice));
        }
        else return;
        console.log(this.data);
        this.render(1);
    }

    static addHeaders() {
        let row = document.createElement("tr");
        let headers = ["", "Name", "Regular Price", "Staff Price", "Discount (%)", "Discount ($)", ""];
        for (let i in headers) {
            let th = document.createElement("th");
            th.innerText = headers[i];
            th.onclick = () => { this.sort(i) };
            row.append(th);
        }
        this.tHead.append(row);
    }

}

class Pagination {

    static ulElement;

    static construct(ulElement) {
        this.ulElement = ulElement;
    }

    static render(currentPage = 1, totalPages = 1) {
        this.clear();
        // Prev
        this.appendListElement("<<", false, currentPage == 1, () => {
            if (currentPage > 1) Table.render(1);
        });
        this.appendListElement("<", false, currentPage == 1, () => {
            if (currentPage > 1) Table.render(currentPage - 1);
        });

        // If there are less than 12 elements, render as usual
        if (totalPages < 12) {
            for (let i = 1; i <= totalPages; i++)
                this.appendListElement(i, i == currentPage, false, () => Table.render(i));
        }
        // Otherwise, there are 12 or more elements
        else {
            let elementsToLeft = currentPage - 1;
            let elementsToRight = totalPages - currentPage;

            // Case 1:      1  2  3  4  5 __  7  8  9 10 11 ...
            // Case 2: ... 10 11 12 13 14 __ 16 17 18 19 20
            // Case 3: ... 10 11 12 13 14 __ 16 17 18 19 20 ...

            if (elementsToLeft < 6) {
                for (let i = 1; i < 12; i++)
                    this.appendListElement(i, i == currentPage, false, () => Table.render(i));
            } 
            else if (elementsToRight < 6) {
                for (let i = totalPages - 10; i <= totalPages; i++)
                    this.appendListElement(i, i == currentPage, false, () => Table.render(i));
            } 
            else {
                for (let i = currentPage - 5; i <= currentPage + 5; i++)
                    this.appendListElement(i, i == currentPage, false, () => Table.render(i));
            }
        }

        // Next
        this.appendListElement(">", false, currentPage == totalPages, () => {
            if (currentPage < totalPages) Table.render(currentPage + 1);
        });
        this.appendListElement(">>", false, currentPage == totalPages, () => {
            if (currentPage < totalPages) Table.render(totalPages);
        });

        
    }

    static appendListElement(text, active, disabled, onclick = () => {}) {
        let li = document.createElement("li");
        let a = li.appendChild(document.createElement("a"));
        li.className = disabled ? "page-item disabled" : active ? "page-item active" : "page-item";
        li.onclick = onclick;
        a.className = "page-link user-select-none";
        a.innerText = text;
        this.ulElement.append(li);
    }

    static appendDots() {
        let li = document.createElement("li");
        let a = li.appendChild(document.createElement("a"));
        li.className = "page-item disabled";
        a.className = "page-link user-select-none";
        a.innerText = "...";
        this.ulElement.append(li);
    }

    static clear() {
        this.ulElement.innerHTML = "";
    }

}

////////////////////////////////
// The juice
////////////////////////////////

async function start() {
    const searchOption = document.getElementById("searchOption");
    const categoryOption = document.getElementById("categoryOption");
    const searchButton = document.getElementById("searchButton");
    const progressBar = document.getElementById("progressBar");
    let searchInProgress = false;

    Table.construct(document.getElementById("table"));
    Pagination.construct(document.getElementById("pagination"));

    setCategories();

    searchButton.onclick = () => {
        let currentCategory = categoryOption.value;
        let currentId = (currentCategory == "All Categories") ? "" : categoryIds[currentCategory];
        search(currentId, searchOption.value);
    }
    
    /** Percent should be 0-1 */
    function setProgress(percent) {
        progressBar.style.width = Math.round(percent * 100) + "%";
    }

    function setCategories() {
        Object.keys(categoryIds).forEach(c => {
            let el = document.createElement("option");
            el.innerText = c;
            el.value = c;
            categoryOption.appendChild(el);
        });
    }

    async function get(url) {
        return await fetch(url).then(r => r.json(), err => {console.log(err); return null});
    }

    async function search(id, query) {
        if (searchInProgress) return alert("A search is already in progress.");
        searchInProgress = true;
        let firstResponse = await get(links.search(id, 1, query));
        console.log("First Response:", firstResponse);
        let totalPages = firstResponse.totalPages;
        let pagesLeft = totalPages;
        if (pagesLeft >= 300) return alert("Search has been cancelled because it would load >300 pages.");
        
        Pagination.clear();
        Table.clearAll();
        setProgress(0.02);

        // Loop over all pages
        for (let page = 1; page <= totalPages; page++) {
            get(links.search(id, page, query)).then(processSearchResponse);
        }

        async function processSearchResponse(searchResponse = exSearchResponse) {
            let staffPrice = await getStaffPrice();
            pushToData(searchResponse, staffPrice);
            pagesLeft--;
            updateProgress();
            
            function extractValidSkus(response = exSearchResponse) {
                return response.products
                    .filter(product => product.sku.length && product.sku[0] != "B")
                    .map(product => product.sku);
            }

            async function getStaffPrice() {
                return await get(links.staffPrice(extractValidSkus(searchResponse)));
            }

            function updateProgress() {
                console.log(`Loading page ${searchResponse.currentPage}/${totalPages}. ${pagesLeft} remaining.`);
                if (pagesLeft <= 0) {
                    Table.render(1);
                    searchInProgress = false;
                };
                setProgress(pagesLeft > 0 ? (totalPages - pagesLeft)/totalPages : 0);
            }
        }

        function pushToData(searchResponse, staffPriceResponse) {
            // let products = exSearchProducts;
            // let detailList = exStaffPriceDetailList;
            let products = searchResponse.products;
            let detailList = staffPriceResponse ? staffPriceResponse.staffPriceDetailList : null;

            products.forEach(product => {
                let detail = detailList ? detailList.find(s => s.sku == sku) : null;
                let staffPrice = (detail && detail.spAllowed != "Y") ? Math.round(detail.staffPrice) : null;
                let itemObject = {
                    name: product.name,
                    sku: product.sku,
                    img: product.thumbnailImage,
                    url: "https://bestbuy.ca" + product.productUrl,
                    regularPrice: Math.round(product.salePrice),
                    staffPrice: staffPrice,
                };
                Table.data.push(itemObject);
            });
        }
    }

}

(function setup() {
    const tempButton = document.createElement("button");
    tempButton.setAttribute("style", "z-index: 110;position: fixed;right: 0px;bottom: 0px;padding: 10px;margin: 10px;border-radius: 100%;background-color: #333;color: #fff;");
    tempButton.id = "tempButton";
    tempButton.innerText = "BB";
    tempButton.onclick = replace;
    document.body.prepend(tempButton);

    function replace() {
        const miniHTML = `<!doctypehtml><html data-bs-theme=dark lang=en><meta charset=UTF-8><meta content="width=device-width,initial-scale=1"name=viewport><title>Document</title><link crossorigin=anonymous href=https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css integrity=sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN rel=stylesheet><style>body{margin:0;padding:0}#main{display:flex;flex-direction:column;padding-top:20vh;gap:20px;position:relative;height:100%;width:100%}img{width:50px}th{background-color:rgba(255,255,255,.1)}th:hover{cursor:pointer}ul{margin:0}li a{width:45px;text-align:center}li:not(.disabled):hover{cursor:pointer}</style><div id=main><div class="container text-center"id=title><h1>BetterBuy</h1></div><div class="container text-center d-flex"><div class="flex-grow-1 pe-1"><input class=form-control id=searchOption placeholder=Search></div><div class="flex-grow-1 px-1"><select class=form-select id=categoryOption><option selected>All Categories</select></div><div class=ps-1><button class="btn btn-primary"id=searchButton type=button>Search</button></div></div><div class=container><div class=progress><div class="progress-bar progress-bar-animated progress-bar-striped"id=progressBar style=width:0%></div></div></div><nav class=container><ul class=pagination id=pagination></ul></nav><div class=container><table class=table id=table><thead><tbody></table></div></div>`;
        document.open();
        document.write(miniHTML);
        start();
    }
})();

////////////////////////////////
// Random Helpers
////////////////////////////////

function toCAD(n) {
    return Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(n);
}

function trimName(name = "", length) {
    if (name.length > length)
        return name.substring(0, length) + "...";
    return name;
}

function percentDiscount(regPrice, disPrice) {
    if (regPrice === null || disPrice === null) return null;
    return (regPrice - disPrice) / regPrice * 100;
}

function percentDiscountFormat(regPrice, disPrice) {
    if (regPrice === null || disPrice === null) return null;
    return `-${percentDiscount(regPrice, disPrice).toFixed(1)}%`;
}

let exSearchProducts = [
    {
        "sku": "11657071",
        "name": "BenQ 1080p Home Theatre Projector (TH671ST)",
        "productUrl": "/en-ca/product/benq-1080p-home-theatre-projector-th671st/11657071",
        "regularPrice": 949.99,
        "salePrice": 949.99,
        "thumbnailImage": "https://multimedia.bbycastatic.ca/multimedia/products/150x150/116/11657/11657071.jpg",
    },
    {
        "sku": "10288222",
        "name": "AAXA LED Pico Projector (KP-101-01)",
        "productUrl": "/en-ca/product/aaxa-aaxa-led-pico-projector-kp-101-01-kp-101-01/10288222",
        "regularPrice": 179.98,
        "salePrice": 179.98,
        "thumbnailImage": "https://multimedia.bbycastatic.ca/multimedia/products/150x150/102/10288/10288222.jpg",
    },
    {
        "sku": "10200521",
        "name": "TygerClaw Home Theatre Projector Mount",
        "productUrl": "/en-ca/product/tyger-claw-tygerclaw-home-theatre-projector-mount-pm6003blk/10200521",
        "regularPrice": 97.98,
        "salePrice": 97.98,
        "thumbnailImage": "https://multimedia.bbycastatic.ca/multimedia/products/150x150/102/10200/10200521.jpg",
    }
];

let exSearchResponse = {
    "currentPage": 1,
    "total": 37174,
    "totalPages": 372,
    "pageSize": 100,
    "products": exSearchProducts,
    "productStatusCode": "200",
};

// response.staffPriceDetailList
let exStaffPriceDetailList = [
    {
        "sku": 10200521,
        "currentPrice": 97.98,
        "spAllowed": "Y",
        "skuDesc": "TYGERCLAW VDF PM6003BLK PROJ MT",
        "staffPrice": 55.91,
        "remark": "Regular Staff Price. Cost plus 5%.",
    },
    {
        "sku": 10288222,
        "currentPrice": 179.98,
        "spAllowed": "Y",
        "skuDesc": "AAXA VDF KP-101-01 LED PROJECTOR EN",
        "staffPrice": 179.98,
        "remark": "Current price < Staff Price.",
    },
    {
        "sku": 11657071,
        "currentPrice": 949.99,
        "spAllowed": "Y",
        "skuDesc": "BENQ DLP PROJ 1080P 3000LM VGA WHT",
        "staffPrice": 949.99,
        "remark": "Current price < Staff Price.",
    },
];

let exItemObject = {
    name: "Product Name",
    sku: "10011001",
    img: "https://multimedia.bbycastatic.ca/multimedia/products/150x150/172/17222/17222124.jpg",
    url: "https://bestbuy.ca/en-ca/product/open-box-sony-65-4k-uhd-hdr-led-smart-google-tv-xr65x90l-2023/17222124",
    regularPrice: 100.00,
    staffPrice: 50.00 || null,
};
