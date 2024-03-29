////////////////////////////////
// Classes and constants
////////////////////////////////

/** Useful links */
const links = {
    /** Random Test API */
    testAPI: "https://get.geojs.io/v1/ip/country.json?ip=8.8.8.8",
    /** Should return a full object that has all info about the Best Buy menu headers and stuff */
    headers: "https://www.bestbuy.ca/api/merch/v2/menus/header/?lang=en-ca",
    /** Should return an object full of category info */
    categories: "https://www.bestbuy.ca/api/merch/v2/menus/header/blted928bb7b8e6c7f8-g1?lang=en-ca",
    staffPriceBase: "https://staffprice-app-hr-staffprice-prod.apps.prod-ocp-corp.ca.bestbuy.com/bizdm/api/staffprice/skus/",
    /** Takes an array of skus (array of strings and/or numbers) and returns a requestable staff price link */
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
    )},
    /** Should return the url to the thumbnail image given the sku */
    thumbnail(sku) {
        let skuStr = `${sku}`;
        let a = skuStr.substring(0, 3);
        let b = skuStr.substring(0, 5);
        return `https://multimedia.bbycastatic.ca/multimedia/products/150x150/${a}/${b}/${skuStr}.jpg`;
    },
    /** Returns the link to the product url given the sku */
    product(sku) {
        return `https://www.bestbuy.ca/en-ca/product/${sku}`;
    }
};

/** 
 * @param {string} url - the url to send get request to
 * @returns {Promise<JSON | null>} - Response as JSON object or null
 */
async function get(url) {
    return await fetch(url).then(r => r.json(), err => { console.log("Error @ get(): ", err); return null });
}

// Helpers
class H {
    /** Converts a number `n` into CAD currency string */
    static toCAD(n) {
        if (typeof n != "number") return console.error("Error @ toCAD(): input is " + n + " of type " + typeof n);
        return Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(n);
    }

    static toPercent(n = 0) {
        if (typeof n != "number") {
            console.error("Error @ toPercent: input number was not a number. n == " + n);
            return `toPercent() fail`;
        }
        return `-${n.toFixed(1)}%`;
    }

    /** Trims `name` to some `length` with `...` appended afterwards */
    static trimName(name = "", length) {
        if (typeof name != "string") return console.error("Error @ trimName(): input name is not a string: " + name);
        if (typeof length != "number") return console.error("Error @ trimName(): input length is not a number: " + length);
        if (name.length > length) return name.substring(0, length) + "...";
        return name;
    }

    /** Gives the % discount between `regularPrice` and `discountPrice` as a number (0-100) */
    static percentDiscount(regularPrice = 0, discountPrice = 0) {
        if (typeof regularPrice != "number") return console.error("Error @ percentDiscount(): regularPrice is not a number: " + regularPrice);
        if (typeof discountPrice != "number") return console.error("Error @ percentDiscount(): discountPrice is not a number: " + discountPrice);
        if (!regularPrice) return 0;
        return (regularPrice - discountPrice) / regularPrice * 100;
    }

    /** Takes a search response (no staffPrice yet because of string int conflict) and returns only valid SKUs as a string[] */
    static extractValidSkus(response = exSearchResponse) {
        if (!response?.products?.length) return console.log(`Error @ extractValidSkus(): Issue with response: ${response}`);
        return response.products
            .filter(product => H.isValidSku(product.sku))
            .map(product => product.sku);
    }

    /** Checks if `sku` is valid and returns a bool */
    static isValidSku(sku) {
        return sku && (sku[0] != "B") && (sku[0] != "M");
    }
}

// Used for storing and mutating data array
class Data {
    /** @type {exItemObject[]} */
    static array = [];

    /** 
     * Add an item to the data array 
     * @param {exItemObject} itemObject
     */
    static addItem(itemObject) {
        Data.array.push(itemObject);
    }

}

// Used for altering the HTML table
class Table {
    static curSortIndex = 0;
    static tBody;
    static tHead;

    /** Constructs the table */
    static construct(table = new HTMLTableElement()) {
        this.tBody = table.tBodies.item(0);
        this.tHead = table.tHead;
        this.addHeaders();
    }

    /** Renders page `pageNumber` of the table */
    static render(pageNumber = 1) {
        this.clearBody();

        let totalPages = Math.ceil(Data.array.length / 100);
        if (totalPages == 0) {
            console.log("Err @ Table.render(): No data to load");
            return Table.clearBody();
        }
        if (pageNumber > totalPages) {
            console.log("Err @ Table.render(): Invalid page number: " + pageNumber);
            return Table.render();
        }

        Pagination.render(pageNumber, totalPages);

        // Render the first 100 elements of this page
        let elementsOnThisPage = (Data.array.length < pageNumber * 100) ? Data.array.length - (pageNumber - 1) * 100 : 100;
        let startIndex = (pageNumber - 1) * 100;
        let itemsOnThisPage = Data.array.slice(startIndex, startIndex + elementsOnThisPage);
        itemsOnThisPage.forEach(item => this.tBody.append(this.formatRow(item)));
    }

    /** Clears the data array, sort index, table body, and pagination */
    static clearAll() {
        Data.array = [];
        this.curSortIndex = 0;
        this.clearBody();
        Pagination.clear();
    }

    /** Clears the body of the table and pagination */
    static clearBody() {
        this.tBody.innerHTML = "";
        Pagination.clear();
    }

    static formatRow(item = exItemObject) {
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
        nameLink.innerText = H.trimName(item.name, 80);
        nameCell.append(nameLink);
        // Regular price cell
        let regularPriceCell = document.createElement("td");
        regularPriceCell.innerText = H.toCAD(item.regularPrice);
        // Staff price cell
        let staffPriceCell = document.createElement("td");
        staffPriceCell.innerText = H.toCAD(item.staffPrice);
        // Percent discount cell
        let percentDiscountCell = document.createElement("td");
        let pDisc = H.toPercent(item.percentDiscount);
        percentDiscountCell.innerText = pDisc;
        // Flat discount cell
        let flatDiscountCell = document.createElement("td");
        flatDiscountCell.innerText = H.toCAD(item.flatDiscount);
        
        // Delete button
        // let deleteButtonCell = document.createElement("td");
        // let deleteButton = document.createElement("button");
        // deleteButtonCell.append(deleteButton);
        // deleteButton.innerText = "X";
        // deleteButton.className = "btn btn-danger";
        // deleteButton.onclick = (ev) => { this.tBody.removeChild(ev.target.parentNode.parentNode) };

        row.append(
            imageCell,
            nameCell,
            regularPriceCell,
            staffPriceCell,
            percentDiscountCell,
            flatDiscountCell
            // deleteButtonCell
        );

        return row;
    }

    static sort(index) {
        // Nothing needs to be sorted
        if (!Data.array.length) return;
        if (index == this.curSortIndex || index < 2 || index > 5) return;
        this.curSortIndex = index;
        console.log("Sorting table by index: " + index);

        if (index == 2) Data.array.sort((a, b) => b.regularPrice - a.regularPrice); // Regular Price
        if (index == 3) Data.array.sort((a, b) => b.staffPrice - a.staffPrice); // Staff Price
        if (index == 4) Data.array.sort((a, b) => b.percentDiscount - a.percentDiscount); // Discount (percent)
        if (index == 5) Data.array.sort((a, b) => b.flatDiscount - a.flatDiscount); // Discount (flat)
        this.render();
    }

    static addHeaders() {
        let row = document.createElement("tr");
        // The first and last empty strings are for images and remove buttons respectively (Add an empty string at the end for delete)
        let headers = ["", "Name", "Regular Price", "Staff Price", "Discount (%)", "Discount ($)"];
        for (let i in headers) {
            let th = document.createElement("th");
            th.innerText = headers[i];
            th.onclick = () => { this.sort(i) };
            row.append(th);
        }
        this.tHead.append(row);
    }

}

// Pagination bar
class Pagination {

    static ulElement;
    static ulElementBottom;

    static construct(ulElement, ulElementBottom) {
        this.ulElement = ulElement;
        this.ulElementBottom = ulElementBottom;
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
        let liTop = document.createElement("li");
        let liBot = document.createElement("li");
        let aTop = liTop.appendChild(document.createElement("a"));
        let aBot = liBot.appendChild(document.createElement("a"));
        liTop.className = disabled ? "page-item disabled" : active ? "page-item active" : "page-item";
        liTop.onclick = onclick;
        liBot.className = disabled ? "page-item disabled" : active ? "page-item active" : "page-item";
        liBot.onclick = onclick;
        aTop.className = "page-link user-select-none";
        aTop.innerText = text;
        aBot.className = "page-link user-select-none";
        aBot.innerText = text;
        this.ulElement.append(liTop);
        this.ulElementBottom.append(liBot);
    }

    static appendDots() {
        let liTop = document.createElement("li");
        let liBot = document.createElement("li");
        let aTop = liTop.appendChild(document.createElement("a"));
        let aBot = liBot.appendChild(document.createElement("a"));
        liTop.className = "page-item disabled";
        liBot.className = "page-item disabled";
        aTop.className = "page-link user-select-none";
        aTop.innerText = "...";
        aBot.className = "page-link user-select-none";
        aBot.innerText = "...";
        this.ulElement.append(liTop);
        this.ulElementBottom.append(liBot);
    }

    static clear() {
        this.ulElement.innerHTML = "";
        this.ulElementBottom.innerHTML = "";
    }

}

// Progress bar
class Progress {
    static progressBarEl;

    /** Percent should be 0-1. If set to 0, text is blank. */
    static setProgress(percent) {
        let percentOutOf100 = Math.round(percent * 100) + "%";
        // this style uses a string like "100%" to work
        this.progressBarEl.style.width = percentOutOf100;
        this.progressBarEl.innerText = percent ? percentOutOf100 : "";
    }
}

// Used for downloading and possibly uploading in the future
class Loading {

    input = null;

    static download() {
        const headers = "Name,Sku,Regular Price,Staff Price,Discount (%),Discount ($)\n";
        const items = Data.array
            .map((i) => [i.name.replace(/,/g, ""), i.sku, i.regularPrice, i.staffPrice, i.percentDiscount, i.flatDiscount].join(",").concat("\n"));
        const blob = new Blob([headers, ...items], { type: 'text/csv' }); 
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'download.csv');
        a.click();
    }

    /** Opens prompt for uploading stuff */
    static upload() {
        if (!Loading.input) {
            Loading.input = document.createElement("input");
            Loading.input.type = "file";
            Loading.input.multiple = true;
            Loading.input.addEventListener("change", Loading.onFileChange)
        }
        // Click it
        Loading.input.click();
    }

    /** @param {Event} e */
    static onFileChange(e) {
        /** @type {File} */
        console.log(e.target.files);
        let reader = new FileReader();
        reader.onloadend = () => { Loading.addToData(reader.result); }
        for (let i = 0; i < e.target.files.length; i++) {
            let file = e.target.files[i];
            if (!file.name.endsWith(".csv")) { console.log("Uploaded a non-CSV: " + file.name); continue; }
            console.log(`Reading file: ${file.name}`);
            reader.readAsText(file);
        }
    }

    static addToData(result = "") {
        if (!result) return console.log("Error @ Loading.addToData(): Result is empty: " + result);
        let items = result.split("\n").map(i => i.replace(/, /g, " "));
        Table.clearBody();
        for (let i = 1; i < items.length; i++) {
            let [name, sku, regularPrice, staffPrice, percentDiscount, flatDiscount] = items[i].split(",");
            if (!sku) continue;
            Data.addItem({
                name,
                sku,
                img: links.thumbnail(sku.toLowerCase()),
                url: links.product(sku.toLowerCase()),
                regularPrice: Number(regularPrice),
                staffPrice: Number(staffPrice),
                percentDiscount: Number(percentDiscount),
                flatDiscount: Number(flatDiscount)
            });
        }
        Table.render();
    }

}

// Used for the search bar and category option bar
class Options {

    static searchOption;
    static categoryOption;
    static categoryIds = {
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
    }

    static construct(searchOption, categoryOption) {
        this.searchOption = searchOption;
        this.categoryOption = categoryOption;
        this.setCategories();
    }

    static setCategories() {
        Object.keys(this.categoryIds).forEach(c => {
            let el = document.createElement("option");
            el.innerText = c;
            el.value = c;
            this.categoryOption.appendChild(el);
        });
    }

    static getID(categoryName) { return this.categoryIds[categoryName]; }

    static get currentCategory() { return this.categoryOption.value; }
    static get currentID() { return (this.currentCategory == "All Categories") ? "" : this.getID(this.currentCategory); }
    static get searchQuery() { return this.searchOption.value; }
}

// Used for searching and stuff
class Search {
    
    static searchInProgress = false;
    static pagesLeft = 0;

    /** Starts a normal search, formatting and adding entries to data, then rendering them in the table */
    static async startNormalSearch() {
        const id = Options.currentID;
        const query = Options.searchQuery;
        if (Search.searchInProgress) return alert("Search is already in progress. Please wait or refresh the page.");
        Search.searchInProgress = true;
        
        let { totalPages } = await Search.verifyFirstResponse(id, query);
        if (!totalPages) return;
        
        Search.pagesLeft = totalPages;
        if (!Search.verifyPageCount(totalPages)) return;
        
        // Clear the previous pagination bar, table, and start progress
        Pagination.clear();
        Table.clearAll();
        Progress.setProgress(0.02);

        // Loop over all pages
        for (let page = 1; page <= totalPages; page++) {
            if (!Search.searchInProgress) return;
            // Do the combined searches in series
            Search.combinedSearch(id, page, query).then(Search.onSearchSuccess, Search.onSearchFail);
        }
    }

    static async startSlowSearch() {
        const id = Options.currentID;
        const query = Options.searchQuery;
        if (Search.searchInProgress) return alert("Search is already in progress. Please wait or refresh the page.");
        Search.searchInProgress = true;
        
        let { totalPages } = await Search.verifyFirstResponse(id, query);
        if (!totalPages) return;
        Search.pagesLeft = totalPages;
        
        // Start page
        let startPage = prompt(`Please enter the starting page [1-${totalPages}]:`, 1);
        if (startPage < 1 || startPage > totalPages) {
            Search.terminateSearch();
            return prompt("Invalid starting page.");
        }
        
        // End page
        let endPage = prompt(`Please enter the end page [${startPage}-${totalPages}]:`, startPage);
        if (endPage < startPage || endPage > totalPages) {
            Search.terminateSearch();
            return prompt("Invalid end page.");
        }
        // Clear the previous pagination bar, table, and start progress
        Pagination.clear();
        Table.clearAll();
        Progress.setProgress(0.01);

        // Loop over selected pages
        for (let page = startPage; page <= endPage; page++) {
            if (!Search.searchInProgress) return;
            // Do the combined search in sequence
            await Search.combinedSearch(id, page, query).then(Search.onSearchSuccess, Search.onSearchFail);
        }
    }

    static async verifyFirstResponse(id, query) {
        let firstResponse = await Search.productSearch(id, 1, query);
        console.log("First Response:", firstResponse);
        if (!firstResponse) {
            Search.terminateSearch();
            return console.error("Error @ startNormalSearch: firstResponse failed, returned: ", firstResponse);
        }
        return firstResponse;
    }

    static verifyPageCount(pageCount) {
        if (pageCount >= 300) {
            Search.terminateSearch();
            alert("Search has been cancelled because it would load >300 pages. This could result in a temporary supension. Use slow search instead.");
            return false;
        }
        return true;
    }

    /** Requests both a product search and a staffPrice search, returns a combined object */
    static async combinedSearch(id, pageNumber, query) {
        // Get the search response
        let searchResponse = await Search.productSearch(id, pageNumber, query);
        
        // Return error if it's nullish
        if (!searchResponse) {
            return console.error("Error @ combinedSearch(): Search response failed and returned null");
        } 
        
        // Extract SKUs
        let skus = H.extractValidSkus(searchResponse);

        // Get staff price response
        let staffPriceResponse = await Search.staffPriceSearch(skus);

        return {
            search: searchResponse,
            staffPrice: staffPriceResponse
        }
    }

    static onSearchSuccess(response = {search: exSearchResponse, staffPrice: exStaffPriceResponse}) {
        console.log(`Page ${response.search.currentPage}`);
        Search.pagesLeft--;
        Search.pushToData(response.search, response.staffPrice);
        if (Search.pagesLeft <= 0) return Search.terminateSearch();
        Progress.setProgress(1 - Search.pagesLeft / response.search.totalPages);
    }

    static onSearchFail(reason) {
        Search.pagesLeft--;
        console.error("Error @ onSearchFail(): Search failed. Reason: ", reason);
        if (Search.pagesLeft <= 0) return Search.terminateSearch();
    }

    /** Requests a product search with target category `id`, `query`, and `pageNumber` and returns the response 
     * @returns {Promise<exSearchResponse | null>}
     */
    static async productSearch(id, pageNumber, query) {
        return await get(links.search(id, pageNumber, query));
    }

    /** Requests a staff price search with array of `skus` (string and/or number) and returns the response 
     * @returns {Promise<exStaffPriceResponse | null>}
     */
    static async staffPriceSearch(skus) {
        return await get(links.staffPrice(skus));
    }

    /** Takes a searchResponse and staffPriceResponse, formats it, and pushes it to data */
    static pushToData(searchResponse = exSearchResponse, staffPriceResponse = exStaffPriceResponse) {
        if (!searchResponse) return console.error("Error @ pushToData(): searchResponse failed");
        if (!staffPriceResponse) console.log("Warning @ pushToData(): Staff price response failed for searchResponse:", searchResponse);
        
        let products = searchResponse.products;
        let detailList = staffPriceResponse?.staffPriceDetailList;

        products.forEach(product => {
            let name = product.name;
            let staffPrice = product.salePrice;
            let percentDiscount = 0;
            let flatDiscount = 0;
            let detail = detailList ? detailList.find(s => s.sku == product.sku) : undefined;
            if (detail) {
                staffPrice = (detail.spAllowed == "Y") ? detail.staffPrice : product.salePrice;
                percentDiscount = H.percentDiscount(product.salePrice, staffPrice);
                flatDiscount = product.salePrice - staffPrice;
                name = detail.skuDesc;
            }
            Data.addItem({
                name: name,
                sku: product.sku,
                img: product.thumbnailImage,
                url: "https://bestbuy.ca" + product.productUrl,
                regularPrice: product.salePrice,
                staffPrice: staffPrice,
                percentDiscount: percentDiscount,
                flatDiscount: flatDiscount
            });
        });
    }

    /** Stop the search, render table and all that */
    static terminateSearch() {
        Progress.setProgress(0);
        Table.render(1);
        Search.searchInProgress = false;
    }
}

// Used for... managing the entire page
class PageManager {
    /** Readies the whole page for use, including buttons, progress bar, options, loading functionality, table */
    static constructPage() {
        Progress.progressBarEl = document.getElementById("progressBar");
        Options.construct(document.getElementById("searchOption"), document.getElementById("categoryOption"));
        Table.construct(document.getElementById("table"));
        Pagination.construct(document.getElementById("pagination"), document.getElementById("paginationBottom"));
        Table.render();

        const searchButton = document.getElementById("searchButton");
        const searchAllButton = document.getElementById("searchAllButton");
        const downloadButton = document.getElementById("csvButton");
        const uploadButton = document.getElementById("uploadButton");
        
        searchButton.onclick = Search.startNormalSearch;
        searchAllButton.onclick = Search.startSlowSearch;
        downloadButton.onclick = Loading.download;
        uploadButton.onclick = Loading.upload;
    }
}

////////////////////////////////
// The juice
////////////////////////////////


function test() {
    console.log("Test Function");
}

(function setup() {
    const tempButton = document.createElement("button");
    tempButton.setAttribute("style", "z-index: 110;position: fixed;right: 0px;bottom: 0px;padding: 10px;margin: 10px;border-radius: 100%;background-color: #333;color: #fff;");
    tempButton.id = "tempButton";
    tempButton.innerText = "BB";
    tempButton.onclick = replace;
    document.body.prepend(tempButton);

    function replace() {
        const miniHTML = `<!doctypehtml><html data-bs-theme=dark lang=en><meta charset=UTF-8><meta content="width=device-width,initial-scale=1"name=viewport><title>Document</title><link crossorigin=anonymous href=https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css integrity=sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN rel=stylesheet><style>body{margin:0;padding:0}#main{display:flex;flex-direction:column;padding-top:20vh;gap:20px;position:relative;height:100%;width:100%}img{width:50px}ul{margin:0}li a{width:45px;text-align:center}li:not(.disabled):hover{cursor:pointer}th{background-color:rgba(255,255,255,.1)}th:hover{cursor:pointer}tr:nth-child(1){width:5%}tr:nth-child(2){text-overflow:ellipsis!important}tr:nth-child(3){width:18%}tr:nth-child(4){width:18%}tr:nth-child(5){width:18%}tr:nth-child(6){width:18%}tr{width:100%;height:1px}</style><div id=main><div class="container text-center"id=title><h1>BetterBuy</h1></div><div class="container text-center d-flex"><div class="flex-grow-1 pe-1"><input class=form-control id=searchOption placeholder=Search></div><div class="flex-grow-1 px-1"><select class=form-select id=categoryOption><option selected>All Categories</select></div><div class=ps-1><button class="btn btn-primary"id=searchButton type=button>Search</button> <button class="btn btn-primary"id=searchAllButton type=button>Search All</button> <button class="btn btn-primary"id=csvButton type=button>CSV</button> <button class="btn btn-primary"id=uploadButton type=button>Upload</button></div></div><div class=container><div class=progress><div class="progress-bar progress-bar-animated progress-bar-striped"id=progressBar style=width:0%></div></div></div><nav class=container><ul class=pagination id=pagination></ul></nav><div class=container><table class=table id=table><thead><tbody></table></div><nav class=container><ul class=pagination id=paginationBottom><li class=page-item><a class="page-link user-select-none">&lt;&lt;</a><li class=page-item><a class="page-link user-select-none">&lt;</a><li class=page-item><a class="page-link user-select-none">1</a><li class=page-item><a class="page-link user-select-none">2</a><li class="page-item active"><a class="page-link user-select-none">3</a><li class=page-item><a class="page-link user-select-none">4</a><li class=page-item><a class="page-link user-select-none">5</a><li class=page-item><a class="page-link user-select-none">6</a><li class=page-item><a class="page-link user-select-none">7</a><li class=page-item><a class="page-link user-select-none">8</a><li class=page-item><a class="page-link user-select-none">9</a><li class=page-item><a class="page-link user-select-none">10</a><li class=page-item><a class="page-link user-select-none">11</a><li class=page-item><a class="page-link user-select-none">></a><li class=page-item><a class="page-link user-select-none">>></a></ul></nav></div>`;
        document.open();
        document.write(miniHTML);
        PageManager.constructPage();
        test();
    }
})();





////////////////////////////////
// Random Stuff
////////////////////////////////

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

let exStaffPriceResponse = {
    "records": 2,
    "staffPriceDetailList": [
        {
            "sku": 16948057,
            "store": 900,
            "avCost": 975.2098,
            "dept": 15,
            "class1": 5,
            "subclass": 3,
            "currentPrice": 999.99,
            "skuType": "MERCH",
            "spAllowed": "Y",
            "skuDesc": "LENOVO 82YL0046CF I5-1335U/16/512/14T",
            "staffPrice": 999.99,
            "remark": "Current price < Staff Price.",
            "image": "https://multimedia.bbycastatic.ca/multimedia/products/300x300/169/16948/16948057.jpg"
        },
        {
            "sku": 17166716,
            "store": 900,
            "avCost": 415.6886,
            "dept": 31,
            "class1": 6,
            "subclass": 1,
            "currentPrice": 489.99,
            "skuType": "MERCH",
            "spAllowed": "Y",
            "skuDesc": "SAMSUNG GW6 CLASSIC 47MM BT BLACK",
            "staffPrice": 436.47,
            "remark": "Regular Staff Price. Cost plus 5%.",
            "image": "https://multimedia.bbycastatic.ca/multimedia/products/300x300/171/17166/17166716.jpg"
        }
    ]
}

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
    percentDiscount: 50.00,
    flatDiscount: 50.00
};
