var host;

var shopifyAppUrl;

// Init Sentry Error Handler
SMAR7.sentry.install();

browser.management.getSelf(function (ext) {
    host = SMAR7.utils.domainUrl(ext.installType);
});

browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if(changeInfo !== undefined && tab !== undefined) {
        if (changeInfo.status === 'complete' && tab.url.indexOf("aliexpress.") !== -1) {
            browser.browserAction.enable(tabId);
        } else if (changeInfo.status === 'complete') {
            browser.browserAction.disable(tabId);
        }
    }
});
// // When the extension is installed or upgraded ...
// browser.runtime.onInstalled.addListener(function () {
//     // Replace all rules ...
//     browser.declarativeContent.onPageChanged.removeRules(undefined, function () {
//         // With a new rule ...
//         browser.declarativeContent.onPageChanged.addRules([
//             {
//                 // That fires when a page's aliexpress search
//                 conditions: [
//                     new browser.declarativeContent.PageStateMatcher({
//                         pageUrl: { hostSuffix: ".aliexpress.com" }
//                     }),
//                     new browser.declarativeContent.PageStateMatcher({
//                         pageUrl: { urlMatches: "https?:\/\/(www.)?aliexpress.com\/(af|wholesale|w|category|store|item)\/.*" }
//                     }),
//                     // TODO: make it with ergexp as well
//                     new browser.declarativeContent.PageStateMatcher({
//                         pageUrl: {
//                             hostEquals: "shoppingcart.aliexpress.com",
//                             pathPrefix: "/shopcart"
//                         }
//                     }),
//                     new browser.declarativeContent.PageStateMatcher({
//                         pageUrl: { hostEquals: "shoppingcart.aliexpress.com", pathPrefix: "/order" }
//                     }),
//                     new browser.declarativeContent.PageStateMatcher({
//                         pageUrl: { hostEquals: "trade.aliexpress.com", pathPrefix: "/orderList" }
//                     }),
//                     new browser.declarativeContent.PageStateMatcher({
//                         pageUrl: { hostSuffix: ".myshopify.com" }
//                     })
//                 ],
//                 // And shows the extension's page action.
//                 actions: [new browser.declarativeContent.ShowPageAction()]
//             }
//         ]);
//     });
// });

/**
 * Products that have to be ordered on supplier's site
 * @type array
 */
var products;

/**
 * Used for "loops" to determine what product (out of products array) is
 * currently is being processed
 * @type integer
 */
var currentProduct;

/**
 * Browser tab that is currently used for handling products ordering process
 * @type integer
 */
var workingTab, cartTab, cartIsNotEmpty = true;

/**
 * Shipping information
 * @type array
 */
var shippingAddress;

/**
 * Preferences set by a merchant. E.g. default shipping method, or message for
 * the seller
 * @type type
 */
var preferences;

var internalOrderId;

var self = this;

/**
 * Listener for catching moment when the tab's address is updated.
 */
browser.tabs.onUpdated.addListener(function (tabId, info, tab) {

    /*
     * Check whether the updated tab is the one we're working on and
     * if the page is loaded
     */
    if (tabId == workingTab && info.status == "complete") {
        // Open a channel with a tab
        var port = browser.tabs.connect(tab.id, { name: "ordering" });

        // Add a listener to the messages sent from a tab
        port.onMessage.addListener(function (msg) {
            switch (msg.status) {
                /*
                 * Item is ordered.
                 * Go to the next product and order it, or go the the shopping
                 * cart to check it out and do other stuff. i.e. go to the next
                 * step
                 */
                case "itemOrdered":
                    if (currentProduct < products.length - 1) {
                        // Order the next one
                        currentProduct++;
                        /*
                         * Just pull out the page of the next product, it will
                         * be processed by tabs.onUpdated listener
                         */
                        // TODO: Store URL in a variable maybe? Sort of a pattern?
                        browser.tabs.update(workingTab, { url: "https://www.aliexpress.com/item/" + products[currentProduct].external_id + ".html" });
                    } else {
                        // Seems like there's no other products to add into a cart
                        currentProduct = 0;
                        // Move to shopping cart page
                        // TODO: put the URL in a variable
                        browser.tabs.update(workingTab, { url: "https://shoppingcart.aliexpress.com/shopcart/shopcartDetail.htm" });
                    }
                    break;
                /*
                 * Shipping method is checked and it's correct
                 */
                case "shippingSelected":
                    // If there's more products that are not verified, check them
                    if (currentProduct < products.length) {
                        // Check and set shipping company for the next item
                        port.postMessage({
                            action: "setShippingCompanies",
                            productId: products[currentProduct].external_id,
                            productIndex: products.length - currentProduct - 1,
                            shippingCompany: products[currentProduct].shippingMethod
                        });
                        currentProduct++;
                    } else {
                        // No product left for shipping verification, accept the cart
                        currentProduct = 0;
                        port.postMessage({ action: "buyCart" });
                    }
                    break;
                case "fulfillOrder":
                    browser.tabs.remove(cartTab);
                    var url = "https://www.aliexpress.com/item/" + products[0].external_id + ".html";
                    browser.tabs.create({ "url": url, "active": true }, function (tab) {
                        workingTab = tab.id;
                    });
                    break;
            }
        });

        // If the current page is item page
        if (SMAR7.ali.page.isItem(tab.url)) {
            let shippingMethodId = '';

            SMAR7.ali.getShippingMethod(products[currentProduct].external_id, shippingAddress.country_code, preferences.epacket).then(rs => {
                shippingMethodId = rs;
            });

            products[currentProduct].shippingMethod = shippingMethodId;
            // Order item
            port.postMessage({
                action: "orderItem",
                quantity: products[currentProduct].quantity,
                options: products[currentProduct].sku,
                shippingMethodId: shippingMethodId
            });
            // Shopping cart
        } else if (SMAR7.ali.page.isCart(tab.url)) {
            // Instruct content script to request Cart API
            if (cartIsNotEmpty) {
                port.postMessage({
                    action: "v2_resetCart"
                });
                cartIsNotEmpty = false;
            } else {
                port.postMessage({
                    action: "v2_processCart",
                    products: products
                });
                cartIsNotEmpty = true;
            }
        } else if (SMAR7.ali.page.isReview(tab.url)) {
            SMAR7.ali.getShippingMethod(products[currentProduct].external_id, shippingAddress.country_code, preferences.epacket).then(shippingMethodId => {
                port.postMessage({
                    action: "v2_setShippingAddress",
                    order: {
                        'shipping': shippingAddress,
                        'shippingMethodId': shippingMethodId,
                        'preferences': preferences
                    },

                });
            });
        } else if (SMAR7.ali.page.isManageAddress(tab.url)) {
            port.postMessage({
                action: "v2_setShippingAddressInsideAEDashboard",
                order: {
                    'shipping': shippingAddress,
                    'preferences': preferences
                }
            });
        }

        /*
         * TODO: there can be locale domain. Like ru.aliexpress.com which breaks this condition
         * Check it if there would be a problem. Postponed due to rare occasions of
         * using of something apart from international domain
         */
        if (tab.url.indexOf("https://www.aliexpress.com/") > -1 || tab.url.indexOf("https://best.aliexpress.com/") > -1) {
            if (SMAR7.afActive) {
                SMAR7.afActive = false;

                var url = "https://www.aliexpress.com/item//" + products[0].external_id + ".html";
                browser.tabs.update({ "url": url, "active": true }, function (tab) {
                    workingTab = tab.id;
                });
            }
        }
    }
});

/**
 * A listener to messages from outside of the extension
 */
browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        var responseStatus = { bCalled: false };

        switch (request.action) {
            case "getItemData":
                $.get(host + "/products/ali?id=" + request.id, function (rs) {
                    sendResponse({ status: "success", content: rs, error: "" });
                }).fail(function (xhr) {
                    var error = ("responseJSON" in xhr && "error" in xhr.responseJSON) ? xhr.responseJSON.error : "";
                    sendResponse({ status: "failed", error: error });
                });
                break;
            case "exportParticularItem":
                // Storage Version
                SMAR7.utils.getStoreDomain().then(function (domain) {
                    try {
                        if (domain) {
                            $.post(host + "/products/connect?shop=" + domain.name, {
                                "itemData": request.itemData,
                                "store": domain.name
                            }, function (rs) {
                                if (rs.status === 'ok') {
                                    sendResponse({ "status": "imported" });
                                } else {
                                    sendResponse({ status: "serverError", error: rs.error });
                                }
                            }).fail(function (xhr) {
                                var error = ("responseJSON" in xhr && "error" in xhr.responseJSON) ? xhr.responseJSON.error : "";
                                sendResponse({ status: "serverError", error: error });
                            });
                        } else {
                            sendResponse({
                                status: "domainError",
                                error: "We're having trouble retrieving your Store Domain. Please try again or contact support."
                            });
                        }
                    } catch (e) {
                        var eventID = SMAR7.sentry.reportError(e, {
                            ali_product: request.itemData.id,
                            method: 'exportParticularItem'
                        });
                        sendResponse({
                            status: "catchedError",
                            error: "We're having trouble retrieving your Store Domain. Please try again or contact support.",
                            code: eventID
                        });
                    }
                }).catch(function (error) {
                    console.log("Failed!", error);
                    sendResponse({
                        status: "domainError",
                        error: "We're having trouble retrieving your Store Domain. Please try again or contact support."
                    });
                });
                break;
            case "resetCart":
                try {
                    let url = "https://shoppingcart.aliexpress.com/shopcart/shopcartDetail.htm";
                    browser.tabs.create({ "url": url, "active": true }, function (tab) {
                        cartTab = tab.id;
                        workingTab = tab.id;
                        currentProduct = 0;
                        products = request.data.products;
                        preferences = request.data.preferences;
                        internalOrderId = request.data.internalOrderId;
                        shippingAddress = Object.assign(request.data.shipping, {
                            'formFilled': false,
                            'formError': false
                        });
                    });
                } catch (e) {
                    SMAR7.sentry.reportError(e, { method: 'resetCart' });
                }
                break;
            case "getOrderShippingData":
                internalOrderId = request.internalOrderId;
                ordersData = {};
                console.log('iId ' + internalOrderId);
                // Get order data
                $.get(host + "/orders/" + internalOrderId + "/orders", function (res) {
                    // Loop through the orders and get the tracking information
                    supplierOrders = res.data;

                    var deferreds = [];
                    for (i = 0; i < supplierOrders.length; i++) {
                        orderNo = supplierOrders[i];
                        ajax = $.ajax({
                            url: "https://trade.aliexpress.com/order_detail.htm?orderId=" + orderNo,
                            type: "GET",
                            dataType: "text",
                        }).then(orderCallback(orderNo));

                        deferreds.push(ajax);
                    }

                    $.when.apply($, deferreds)
                        .then(function () {
                            $.ajax({
                                url: host + "/orders/storeorderdata",
                                type: "POST",
                                data: { data: JSON.stringify(ordersData) },
                                dataType: "json",
                            }).done(function (response) {
                                if (typeof response.error != "undefined") {
                                    sendResponse({ status: response.error });
                                    return;
                                }

                                // If some of orders failed to parse - show info
                                if (
                                    typeof response.failedList != "undefined" &&
                                    response.failedList.length
                                ) {
                                    sendResponse({
                                        status: "orderParsingError",
                                        failedList: response.failedList
                                    });
                                    return;
                                }

                                sendResponse({ status: "ok" });
                            }).fail(function () {
                                sendResponse({ status: "serverError" });
                            });

                        }).fail(function (args) {
                        if ("orderParsingError" === args.error) {
                            sendResponse({ status: args.error });
                        } else {
                            sendResponse({ status: "ajaxError" });
                        }
                    });
                });
                break;
            case "getOrderData":
                // Get tracking info
                orderNo = request.orderNo;
                ordersData = {};
                ajax = $.ajax({
                    url: "https://trade.aliexpress.com/order_detail.htm?orderId=" + orderNo,
                    type: "GET",
                    dataType: "text",
                }).then(orderCallback(orderNo));

                // Send it to the server
                $.when(ajax).then(function () {
                    $.ajax({
                        url: host + "/orders/storeorderdata",
                        type: "POST",
                        data: { data: JSON.stringify(ordersData) },
                        dataType: "json",
                    }).done(function (response) {
                        if (typeof response.error != "undefined") {
                            sendResponse({ status: response.error });
                            return;
                        }
                        sendResponse({ status: "ok" });
                    }).fail(function () {
                        sendResponse({ status: "serverError" });
                    });
                }).fail(function (args) {
                    if ("orderParsingError" === args.error) {
                        sendResponse({ status: args.error });
                    } else {
                        sendResponse({ status: "ajaxError" });
                    }
                });
                break;
            case "v2_formFilled":
                shippingAddress.formFilled = true;
                sendResponse('OK');
                break;
            case "v2_formError":
                shippingAddress.formError = true;
                sendResponse('OK');
                break;
        }

        /*
         * To indicate it's going to send response asynchronously.
         * For making sure message channel is open.
         */
        return true;
    }
);

function gup(name, url) {
    if (!url) url = location.href;
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(url);
    return results == null ? null : results[1];
}

var orderCallback = function (index) {
    return function (response) {

        data = {};

        try {
            data.products = [];
            $(response).find(".product-table tr.order-bd").each(function () {
                var productLink = $(this).find(".desc a").attr("href");
                var match = productLink.match(/productId=(\d+)/);
                var product = {};
                product.id = match[1];
                product.quantity = $(this).find(".quantity").attr("title");
                data.products.push(product);
            });

            data.buyerName = $(response).find("span[i18entitle='Contact Name']").text();
            data.orderNo = $(response).find("#order-num-box .order-no").text();

            var shipping = {};
            shipping.address = $(response).find("span[i18entitle='Address']").text();
            shipping.zip = $(response).find("span[i18entitle='Zip Code']").text();
            data.shipping = shipping;

            // Getting last item of Tracking Number List.
            // because there can be big lists with few changing each other numbers
            var tracking = {};
            tracking.company = $(response).find(".shipping-bd .logistics-name").last().text();
            tracking.code = $(response).find(".shipping-bd .no").last().text().trim();
            data.tracking = tracking;

            ordersData[index] = data;

        } catch (e) {
            SMAR7.sentry.reportError(e, { method: 'orderCallback' });

            // Something wrong with the response
            return $.Deferred().reject({ error: "orderParsingError" })
        }
    }
}

