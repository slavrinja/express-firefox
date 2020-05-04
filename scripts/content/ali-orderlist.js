/**
 * Deprecated: Use SMAR7.notification instead
 */
function setProcessingMessage(text) {
    var logoURL = chrome.extension.getURL("images/package16.png");
    var loadingURL = chrome.extension.getURL("images/settings.png");
    return noty({
        text:"\
            <div class='status-title'>\
                <img src='"+logoURL+"'/>&nbsp;&nbsp;<span>SMAR7 Express</span>\
            </div>\
            <div class='status-image rotatable'>\
                <img src='"+loadingURL+"'/>\
            </div>\
            <div class='status-text'>\
                <p>"+text+"</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        animation: {
            open: {height: 'toggle'},
            close: {height: 'toggle'},
            easing: "swing",
            speed: 100
        }
    });
}

$(function () {
    addDetailsButton();
    SMAR7.loadFonts();

    $(".smar7-express-button").on("click", function(event) {
        // Show message that product is being uploaded
        var noty = SMAR7.notification("Order data is being transferred to Shopify", "gear");

        // Get order number
        var orderNo = $(this).siblings(".button-logisticsTracking").attr("orderid");

        chrome.runtime.sendMessage(undefined, {"action": "getOrderData", "orderNo": orderNo}, undefined, function (response) {
            noty.close();
            if (chrome.runtime.lastError) {
                SMAR7.notification("We were unable to download tracking codes" + chrome.runtime.lastError.message, "error");
            } else if (typeof response == 'undefined') {
                SMAR7.notification("Something went wrong during order data retrieving", "error");
            } else {
                switch (response.status) {
                    case "ok" :
                        SMAR7.notification("Order data has been successfully sent", "success");
                        break;
                    case "serverError":
                        var errorMessage = "Server couldn't handle the request! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
                        SMAR7.notification(errorMessage, "error");
                        break;
                    case "ajaxError":
                        SMAR7.notification("Order data cannot be retrieved. Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
                        break;
                    case "notLoggedIn":
                        SMAR7.notification("It seems you're not logged in to Express", "error");
                        break;
                    case "noMatch":
                        SMAR7.notification("No matching order found", "error");
                        break;
                    case "orderParsingError":
                        SMAR7.notification("Order data is unavailable. Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
                        break;
//                    case "noTrack":
//                        setFailMessage("No tracking code found for this order");
//                        break;
                    default:
                        SMAR7.notification("Error occured during order data retrieving. Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
                }
            }
        });
    });
});

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setFailMessage(text) {
    if (undefined === text) {
        var text = "Error occured! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
    }
    var logoURL = chrome.extension.getURL("images/package16.png");
    var errorURL = chrome.extension.getURL("images/cancel.png");
    return noty({
        text:"\
            <div class='status-title'>\
                <img src='"+logoURL+"'/>&nbsp;&nbsp;<span>SMAR7 Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='"+errorURL+"'/>\
            </div>\
            <div class='status-text'>\
                <p>"+text+"</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: 6000
    });
}

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setSuccessMessage(text) {
    var logoURL = chrome.extension.getURL("images/package16.png");
    var tickURL = chrome.extension.getURL("images/checked.png");
    return noty({
        text:"\
            <div class='status-title'>\
                <img src='"+logoURL+"'/>&nbsp;&nbsp;<span>SMAR7 Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='"+tickURL+"'/>\
            </div>\
            <div class='status-text'>\
                <p>"+text+"</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: 3000
    });
}

function addDetailsButton() {
    var iconLink = chrome.extension.getURL("images/order.png");

    $(".button-logisticsTracking").closest(".order-action").prepend("\
        <button class='ui-button ui-button-normal smar7-express-button smar7-smaller'>\
            <img src='"+iconLink+"'><span>Get order data</span>\
        </button>\
    ");
}
