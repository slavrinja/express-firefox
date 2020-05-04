$(function () {
    addImportButton();
    SMAR7.loadFonts();

    $(".list-item").hover(function() {
        $(this).find("img.picCore").addClass("greyed-out");
        $(this).find(".smar7-express").show();
    }, function() {
        $(this).find("img.picCore").removeClass("greyed-out");
        $(this).find(".smar7-express").hide();
    });

    $(".smar7-express").on("click", async function (event) {
        var domain =  await SMAR7.utils.getStoreDomain();
        if (!domain) {
            let msg = "Before importing products, you must <strong>connect</strong> the extension to your store. Open SMART Express and look for the <strong>Connect Extension</strong> button";
            SMAR7.notification(msg, "warning");
            return;
        }

        // Show message that product is being uploaded
        var noty = SMAR7.notification("Product is being transferred to <strong>Shopify</strong>", "gear");

        // What's the item to export?
        var itemLink = $(this).closest("li").find(".picRind").attr("href");
        var match = itemLink.match(/\/(\d*)\.html/);
        var productId = match[1];

        // To prevent mixed content error
        match = document.location.href.match(/(https?):\/\//);

        var protocol = match[1];
        itemLink = protocol + ":" + itemLink;

        $.get(itemLink, function(content) {

            // Get all the variants and their prices
            var match = $(content).find(".detail-wrap script").html().match(/var skuProducts=(\[.*\])/);
            var pricesRaw = JSON.parse(match[1]);
            var prices = [];
            for (var key in pricesRaw) {
                prices.push({"sku": pricesRaw[key].skuPropIds, "price": pricesRaw[key].skuVal.skuCalPrice});
            }

            // TODO: into the function
            if ($(content).find("#j-image-thumb-list img").length > 0) {
                var images = $(content).find("#j-image-thumb-list img").map(function () {
                    var str = $(this).attr("src"); return {"src": str.substr(0, str.length - 10)}
                }).get()
            } else {
                // There's gotta be only one image
                var images = [];
                images.push(protocol+"://www.aliexpress.com/item-img//"+productId+".html");
            }

            var itemData = {
                "id": productId,
                "supplier":"aliexpress",
                "title":
                    $(content).find(".product-name").html(),
                // All possibe options
                "options":
                    $(content).find("#j-product-info-sku .p-property-item .p-item-title").map(function() {
                        var str = $(this).html();
                        return {"name": str.substr(0, str.length - 1)}
                    }).get(),
                // All variants. Titles getting stripped fomr html tags
                "optionValues":
                    $(content).find(".sku-attr-list a").map(function() {
                        var title = ($(this).attr("title") === undefined) ? $(this).text() : $(this).attr("title");
                        return {"sku": $(this).data("sku-id"), "title": title}
                    }).get(),
                // Prices for every variant
                "prices": prices,
                "images": images,
                "variant_images":
                    $(content).find(".sku-attr-list img").map(function() {
                        return {"src": $(this).attr("bigpic")};
                    }).get(),
            };

            var timestamp = $.now();
            var descriptionUrl = protocol+"://www.aliexpress.com/getDescModuleAjax.htm?productId=" + productId + "&t=" + timestamp;

            // Set description
            $.get(descriptionUrl, function(result) {
                var matches = result.match(/productDescription='(.*)'/);
                itemData.body_html = matches[1];

                SMAR7.importItem(itemData);
            }).fail(function(jqXHR, textStatus) {
                SMAR7.notification("Something went wrong! <br>Error code: 002-" + jqXHR.status, "error");
            });

        }).fail(function(jqXHR, textStatus) {
            SMAR7.notification("Something went wrong! <br>Error code: 001-" + jqXHR.status, "error");
        });
    });
});

/*
 * Set a button for exporting to Shopify
 */
function addImportButton() {
    var iconLink = browser.extension.getURL("images/down-arrow.png");

    $(".list-item .img").prepend("\
        <div class='smar7-express'>\
            <img src='"+iconLink+"'>\
        </div>\
    ");
}
/**
 * Deprecated: Use SMAR7.notification instead
 */
function setSuccessMessage() {
    var logoURL = browser.extension.getURL("images/package16.png");
    var tickURL = browser.extension.getURL("images/checked.png");
    return noty({
        text:"\
            <div class='status-title'>\
                <img src='"+logoURL+"'/>&nbsp;&nbsp;<span>SMART Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='"+tickURL+"'/>\
            </div>\
            <div class='status-text'>\
                <p>Product has been successfully imported to Shopify</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: 6000
    });
}
/**
 * Deprecated: Use SMAR7.notification instead
 */
function setLoadingMessage() {
    var logoURL = browser.extension.getURL("images/package16.png");
    var loadingURL = browser.extension.getURL("images/loading.png");
    return noty({
        text:"\
            <div class='status-title'>\
                <img src='"+logoURL+"'/>&nbsp;&nbsp;<span>SMART Express</span>\
            </div>\
            <div class='status-image rotatable'>\
                <img src='"+loadingURL+"'/>\
            </div>\
            <div class='status-text'>\
                <p>Product is being transferred to Shopify</p>\
            </div>",
        layout: "topRight",
        theme: "relax"
    });
}
/**
 * Deprecated: Use SMAR7.notification instead
 */
function setFailMessage(text) {
    if (undefined === text) {
        var text = "Error occured! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
    }
    var logoURL = browser.extension.getURL("images/package16.png");
    var errorURL = browser.extension.getURL("images/cancel.png");
    return noty({
        text:"\
            <div class='status-title'>\
                <img src='"+logoURL+"'/>&nbsp;&nbsp;<span>SMART Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='"+errorURL+"'/>\
            </div>\
            <div class='status-text'>\
                <p>"+text+"</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: false
    });
}
