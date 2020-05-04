/* Smar7Apps Namespace */
/* globals chrome */

var SMAR7 = SMAR7 || {};

SMAR7.noty = null;
SMAR7.images = {
    logo: chrome.extension.getURL("images/package16.png"),
    logom: chrome.extension.getURL("images/package64.png"),
    logob: chrome.extension.getURL("images/package128.png"),
    loading: chrome.extension.getURL("images/settings.png"),
    success: chrome.extension.getURL("images/sm7_success.png"),
    warning: chrome.extension.getURL("images/sm7_warning.png"),
    error: chrome.extension.getURL("images/sm7_error.png"),
    gear: chrome.extension.getURL("images/sm7_gear.png"),
    cart: chrome.extension.getURL("images/sm7_cart.png"),
    list: chrome.extension.getURL("images/sm7_list.png"),
};
SMAR7.callback = null;

SMAR7.suppliers = {
    aliexpress: "aliexpress"
};

/* jQuery Plugins */
$.fn.smar7CleanHtml = function () {
    return $.trim(this.html().replace(/[\(\[][$€£¥{CA$}{AU$}{NZ$}{HK$}0-9\.]+[\)\]]/g, ''));
};

$.fn.dropDownOptionContaining = function (text) {
    var $options = this.find('option:contains(' + text + ')');

    if ($options.length <= 1) {
        return $options;
    }

    if ($options.length > 1) {
        for (var i = 0; i < $options.length; i++) {
            var cleanText = $.trim($options[i]);
            if (cleanText != text) {
                $options.splice(i, 1);
            }
        }
        return $options;
    }
};

/* Common functions */
SMAR7.loadFonts = function () {
    var fontUrl = chrome.extension.getURL("fonts/Roboto-Light.ttf");

    var style = document.createElement('style');
    var style_str = "@font-face {";
    style_str = style_str + "font-family: \"RobotoRegular\";";
    style_str = style_str + "src: url(" + fontUrl + ");";
    style_str = style_str + "}";
    style.innerHTML = style_str;
    document.documentElement.appendChild(style);

    var fontUrl = chrome.extension.getURL("fonts/Roboto-Black.ttf");

    var style = document.createElement('style');
    var style_str = "@font-face {";
    style_str = style_str + "font-family: \"RobotoBlack\";";
    style_str = style_str + "src: url(" + fontUrl + ");";
    style_str = style_str + "}";
    style.innerHTML = style_str;
    document.documentElement.appendChild(style);

    var fontUrl = chrome.extension.getURL("fonts");
    var style = document.createElement('style');
    var style_str = "@font-face {";
    style_str = style_str + "font-family: \"smart\";";
    style_str = style_str + "src: url('" + fontUrl + "/smart.eot?51306448');";
    style_str = style_str + "src: url('" + fontUrl + "/smart.eot?51306448#iefix')" +
        " format('embedded-opentype'),";
    style_str = style_str + "url('" + fontUrl + "/smart.woff2?51306448') format('woff2'),";
    style_str = style_str + "url('" + fontUrl + "/smart.woff?51306448') format('woff'),";
    style_str = style_str + "url('" + fontUrl + "/smart.ttf?51306448') format('truetype'),";
    style_str = style_str + "url('" + fontUrl + "/smart.svg?51306448#smart') format('svg');";
    style_str = style_str + "font-weight: normal;";
    style_str = style_str + "font-style: normal;";
    style_str = style_str + "}";
    style.innerHTML = style_str;
    document.documentElement.appendChild(style);
};

/**
 * Shows notification in supplier store

 * @param String text. Text of the notification
 * @param String type. Icon to load. See SMAR7.images for available options
 */
SMAR7.notification = function (text, img) {
    if (SMAR7.noty) {
        SMAR7.noty.close();
        SMAR7.noty = null;
    }

    var icon = img || 'loading';
    if (typeof SMAR7.images[icon] != 'undefined') {
    } else {
        icon = 'loading';
    }

    SMAR7.noty = noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + SMAR7.images[icon] + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        animation: {
            open: 'noty_effects_open',
            close: null
        }
    });

    return SMAR7.noty;
};

SMAR7.addConfirmMessage = function (text, confirmCallBack) {
    if (SMAR7.noty) {
        SMAR7.noty.close();
    }

    var myNoty = noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <button class='btn-primary' type=\"button\" value=\"Confirm\" id='smar7-confirm-button'>Continue</button>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        animation: {
            open: { height: 'toggle' },
            close: { height: 'toggle' },
            easing: "swing",
            speed: 100
        }
    });

    setTimeout(function () {
        $('#smar7-confirm-button').click(confirmCallBack);
    }, 200);

    return myNoty;
};

SMAR7.updateProcessingMessage = function (text) {
    $('.noty_message .status-text').html(text);
};

SMAR7.ucwords = function (string) {
    return string.toLowerCase().replace(/\b[a-z]/g, function (letter) {
        return letter.toUpperCase();
    });
};

SMAR7.ucfirst = function (string) {
    return string.substring(0, 1).toUpperCase() + string.substring(1).toLowerCase();
};

SMAR7.importItem = function (itemData) {
    chrome.runtime.sendMessage(undefined, {
        action: "exportParticularItem",
        itemData
    }, undefined, function (response) {
        if (typeof response != 'undefined') {
            if ("imported" === response.status) {
                SMAR7.notification("Product has been successfully imported to Shopify", "success");
            } else if ("serverError" === response.status) {
                const errorMessage = response.error || "Server couldn't handle the request! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
                SMAR7.notification(errorMessage, "error");
            } else if ("cookieError" === response.status) {
                SMAR7.notification("Error occurred. Please open the SMAR7 Express dashboard in Shopify, refresh this product page and import again", "error");
            } else if ("catchedError" === response.status) {
                SMAR7.notification("Error occurred. Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>. <br>Error code: <br><span class='smar7-badge'>" + response.code + "</span>", "error");
            } else {
                SMAR7.notification("Error occurred. Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
            }
        } else {
            if (chrome.runtime.lastError) {
                SMAR7.notification("Error occurred: " + chrome.runtime.lastError.message, "error");
            } else {
                SMAR7.notification("Error occurred during product importing. Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
            }
        }
    });
};
/**
 * Deprecated: Use SMAR7.notification instead
 */
SMAR7.setProcessingMessage = function (text) {
    if (SMAR7.noty) {
        SMAR7.noty.close();
    }
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + SMAR7.images.gear + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        animation: {
            open: { height: 'toggle' },
            close: { height: 'toggle' },
            easing: "swing",
            speed: 100
        }
    });
};
/**
 * Deprecated: Use SMAR7.notification instead
 */
SMAR7.setFailMessage = function (text) {
    if (SMAR7.noty) {
        SMAR7.noty.close();
    }
    if (undefined === text) {
        var text = "Error occurred! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
    }

    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + SMAR7.images.error + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: 8842000
    });
};
/**
 * Deprecated: Use SMAR7.notification instead
 */
SMAR7.setSuccessMessage = function () {
    return noty({
        text: "\
            <div class='status-title'>\
                <img src='" + SMAR7.images.logo + "'/>&nbsp;&nbsp;<span>SMAR7 Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + SMAR7.images.success + "'/>\
            </div>\
            <div class='status-text'>\
                <p>Product has been successfully imported to Shopify</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: 3000
    });
};
/**
 * Deprecated: Use SMAR7.notification instead
 */
SMAR7.setLoadingMessage = function () {
    return noty({
        text: "\
            <div class='status-title'>\
                <img src='" + SMAR7.images.logo + "'/>&nbsp;&nbsp;<span>SMAR7 Express</span>\
            </div>\
            <div class='status-image rotatable'>\
                <img src='" + SMAR7.images.loading + "'/>\
            </div>\
            <div class='status-text'>\
                <p>Product is being transferred to Shopify</p>\
            </div>",
        layout: "topRight",
        theme: "relax"
    });
};
/**
 * Deprecated: Use SMAR7.notification instead
 */
SMAR7.setWarningMessage = function (text) {
    if (SMAR7.noty) {
        SMAR7.noty.close();
    }
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + SMAR7.images.warning + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax"
    });
};

SMAR7.randomIntFromInterval = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

/* HELPER METHODS */

// Parse OLD UI Aliexpress product page
function oldUiImport(markup = $("body").html()) {
    // If new UI import failed - getting product the old way :(

    // Get all the variants and their prices
    let match = $(".detail-wrap script").html().match(/var skuProducts=(\[.*\])/);
    let pricesRaw = JSON.parse(match[1]);
    let prices = [];

    for (let key in pricesRaw) {
        prices.push({
            "sku": pricesRaw[key].skuPropIds,
            "price": pricesRaw[key].skuVal.skuCalPrice,
            "price_normal": pricesRaw[key].skuVal.skuCalPrice
        });
    }

    windowVariables = retrieveWindowVariables(["productDescription"]);

    match = window.location.href.match(/\/(\d*)\.html/);
    const productId = match[1];

    // To prevent mixed content error
    match = document.location.href.match(/(https?):\/\//);
    const protocol = match[1];

    // TODO: into the function
    if ($("#j-image-thumb-list img").length > 0) {
        const images = $("#j-image-thumb-list img").map(function () {
            const str = $(this).attr("src");
            return { src: str.substr(0, str.length - 10) }
        }).get()
    } else {
        // There's gotta be only one image
        const images = [];
        const str = $(".ui-image-viewer-thumb-frame img").attr("src");
        images.push({ src: str.substr(0, str.length - 12) });
    }

    // All possible options with values
    let options = getOptions();

    let itemData = {
        "id": productId,
        "supplier": "aliexpress",
        "title": $(".product-name").html(),
        options,
        // Prices for every variant
        prices,
        // Description
        "body_html":
        windowVariables.productDescription,
        images,
        "variant_images":
            $(".sku-attr-list img").map(function () {
                return { "src": $(this).attr("bigpic") };
            }).get(),
    };

    // Most likely it's not loaded. Because it's fetched by ajax request. Force it to load
    if (windowVariables.productDescription === undefined) {
        var timestamp = $.now();
        $.get(protocol + "://www.aliexpress.com/getDescModuleAjax.htm?productId=" + productId + "&t=" + timestamp, function (result) {
            var matches = result.match(/productDescription='(.*)'/);
            itemData.body_html = matches[1];
        }).fail(function () {
            SMAR7.notification("Error occurred! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
        });
    }

    return itemData;
}

// Getting the array of product options with values
function getOptions() {
    let titles = [],
        options = [],
        titlesCount = {};

    $("#j-product-info-sku .p-property-item").map(function (index) {
        // Get option group name
        let name = $(this).find('.p-item-title').html();

        // get option variants
        const values = $(this).find(".sku-attr-list a").not('.sizing-info-item').map(function (index) {
            if ($(this).parent().hasClass('sizing-info-item')) {
                return null;
            }

            // try to get variant's image
            let img = "";
            if ($(this).find('img') !== undefined && $(this).find('img').attr('src') !== undefined) {
                img = $(this).find('img').attr('src');
            }

            // Get variants' title
            var title = ($(this).attr("title") === undefined) ? $(this).text() : $(this).attr("title");
            if (typeof titlesCount[title] != 'undefined') {
                titlesCount[title] = titlesCount[title] + 1;
            } else {
                titlesCount[title] = 1;
            }
            var existingIndex = $.inArray(title, titles);
            if (existingIndex > -1) { // already exist
                title = title + ' #' + (titlesCount[title] - 1);
            } else {
                titles.push(title);
            }
            // Get cku number
            const sku = $(this).data("sku-id");

            return { sku, title, img };
        }).get();

        options.push({ name, values });
    });

    return options;
}

// Parse new UI Aliexpress product page
function newUiImport(markup = $("body").html()) {
    let image = "",
        i, j, len0, len1,
        priceInfo = [],
        variant_images = [];
    const match = markup.match(/(?<=\"productSKUPropertyList\"\:).+?(?<=\}\]\}\])/);
    const priceList = markup.match(/(?<=\"skuPriceList\"\:).+?(?=\,\"warrantyDetailJson)/);
    const pageList = markup.match(/(?<=\"pageModule\"\:).+?(?=\,\"preSaleModule)/);
    const imgList = markup.match(/(?<=\"imageModule\"\:).+?(?=\,\"installmentModule)/);

    // Try to get itemInfo different ways
    let itemRaw = markup.match(/(?<=\"actionModule\"\:).+?(?=\,\"buyerProtectionModule)/);
    let itemInfo = null;
    try {
        itemInfo = JSON.parse(itemRaw[0]);
    } catch (e) {
        console.log("itemInfo parsing error #1");
        // console.error(e);
        try {
            itemRaw = markup.match(/(?<=\"actionModule\"\:).+?(?=\,\"aePlusModule)/);
            itemInfo = JSON.parse(itemRaw[0]);
        } catch (e) {
            console.log("itemInfo parsing error #2");
            // console.error(e)
        }
    }

    const pageInfo = JSON.parse(pageList[0]);
    const imgInfo = JSON.parse(imgList[0]);
    const variants = JSON.parse(match);
    const options = [];
    const prices = [];
    const images = [];

    // in some cases import crashes here
    try {
        priceInfo = JSON.parse("[{" + priceList[0].match(/(?<=\[\{).+?(?<=\}\])/));
    } catch (e) {
        console.log("priceInfo parsing error #1");
        console.log(priceList[0]);
        try {
            priceInfo = JSON.parse(priceList[0]);
        } catch (e) {
            console.log("priceInfo parsing error #2");
            console.log(priceList[0]);
        }
    }

    // Getting array of options / variants
    for (i = 0, len0 = !variants ? 0 : variants.length; i < len0; i++) {
        let variant = variants[i];
        let optionValues = [];
        let titles = [];
        let title = "";

        for (j = 0, len1 = variant.skuPropertyValues.length; j < len1; j++) {
            let img = "";
            let item = variant.skuPropertyValues[j];

            if (item.skuPropertyImageSummPath !== undefined) {
                img = item.skuPropertyImageSummPath;
            }

            titles = optionValues.map(({ title }) => title);
            title = titles.indexOf(item.propertyValueDisplayName) === -1 ?
                item.propertyValueDisplayName :
                item.propertyValueName;
            optionValues.push({
                sku: item.propertyValueId,
                title: title,
                img
            });

            if (typeof item.skuPropertyImagePath !== "undefined") {
                variant_images.push({
                    src: item.skuPropertyImagePath.replace("_640x640.jpg", "")
                });
            }
        }

        options.push({
            name: variant.skuPropertyName,
            values: optionValues
        });
    }

    for (i = 0, len0 = priceInfo.length; i < len0; i++) {
        prices.push({
            sku: priceInfo[i].skuPropIds,
            price: priceInfo[i].skuVal.actSkuMultiCurrencyCalPrice || priceInfo[i].skuVal.skuMultiCurrencyCalPrice || priceInfo[i].skuVal.actSkuCalPrice || priceInfo[i].skuVal.skuCalPrice,
            price_normal: priceInfo[i].skuVal.skuCalPrice || 0
        });
    }

    for (i = 0, len0 = imgInfo.imagePathList.length; i < len0; i++) {
        images.push(
            { src: imgInfo.imagePathList[i] }
        );
    }

    let title = $(".product-title").text();
    // Try to get title from markup - this field can't be empty
    // TODO check it's always work
    if (title === "") {
        const subtitle = markup.match(/(?<=\"subject\"\:).+?(?=\")/);
        title = subtitle[0];
    }

    // get product main image
    if (imgInfo.imagePathList !== undefined &&
        imgInfo.imagePathList[0] !== undefined &&
        imgInfo.imagePathList[0] !== ""
    ) {
        image = imgInfo.imagePathList[0];
    }

    return {
        id: itemInfo.productId,
        supplier: "aliexpress",
        title,
        options,
        prices,
        body_html: pageInfo.description,
        images,
        image,
        variant_images
    };
}
