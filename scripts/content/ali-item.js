/* globals SMAR7 newUiImport */
// Init Sentry Error Handler
SMAR7.sentry.install();

browser.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {
        switch (msg.action) {
            // ----------------- UI V1 ------------------//
            case "orderItem":
                setProcessingMessage("Adding the product to the cart");
                try {
                    // check if new Ali UI used
                    let newUI = !$("#j-p-quantity-input").length,
                        quantity = msg.quantity;

                    // Set quantity
                    if (newUI) {
                        // Setting input value is failing by Aliexpress' focus protect script
                        // $(".product-number-picker").find('input').val(msg.quantity);

                        // So just clicking needed number (starting from 1 already)
                        for (let i = 1; i < quantity; i++) {
                            $(".product-number-picker").find('.next-after button').click();
                        }
                    } else {
                        $("#j-p-quantity-input").val(quantity);
                    }

                    // set variants
                    if (msg.options && (msg.options.length > 0)) {
                        let options = msg.options.split(",");
                        if (newUI) {
                            let itemData = newUiImport();
                            if (!($.isEmptyObject(itemData.options))) {
                                for (let i in options) {
                                    const sku = options[i];
                                    const values = itemData.options[i].values;
                                    let index = values.findIndex(value => `${value.sku}` === `${sku}`);

                                    if (index >= 0) {
                                        const optionIndex = parseInt(i, 10);
                                        const variantIndex = parseInt(index, 10) + 1;
                                        const sel = $(`.product-sku .sku-property-list:eq(${optionIndex})`).find(`.sku-property-item:nth-of-type(${variantIndex})`);

                                        if (sel.length && values.length > 1) {
                                            sel.click().addClass('selected');
                                        } else {
                                            console.log("Unable to select specific variant (" + i + ")");
                                        }
                                    } else {
                                        console.log("Unable to find specific variants (" + i + ")");
                                    }
                                }
                            }
                        } else {
                            // Clear selection if any
                            options.forEach(function (current, index) {
                                let elems = $("#j-product-info-sku ul").eq(index).children();

                                elems.each(function (i, elem) {
                                    if ($(elem).hasClass('active')) {
                                        $(elem).removeClass('active');
                                    }
                                });
                            });

                            // Select variants
                            options.forEach(function (current, index) {
                                let elems = $("#j-product-info-sku ul").eq(index).find("a[data-sku-id='" + current + "']");

                                if (elems.length > 0) {
                                    elems.get(0).click();
                                }
                            });
                        }
                    }

                    setTimeout(function () {
                        let shippingMethodElement = newUI ? $(".logistics").find(".logo-" + msg.shippingMethodId.toLowerCase()) : $("form#buy-now-form input[name='shippingCompany']"),
                            submitElement = newUI ? $(".product-action").find(".addcart") : $("#j-add-cart-btn");

                        if (newUI) {
                            // Click for select shipping method
                            if (("" !== msg.shippingMethodId) && (0 < shippingMethodElement.length)) {
                                shippingMethodElement.parents(".table-tr").find("label").click();

                                // Apply form
                                setTimeout(function () {
                                    $(".logistics").parents(".next-dialog").find('.next-btn').click();
                                }, 500);
                            }
                        } else {
                            // Set hidden field of the shipping method
                            shippingMethodElement.val(msg.shippingMethodId);
                        }

                        // Submit BuyNow / Add to Cart form
                        setTimeout(function () {
                            if (0 < submitElement.length) {
                                submitElement[0].click();
                                setTimeout(function () {
                                    port.postMessage({ status: "itemOrdered" });
                                }, 700);
                            } else {
                                SMAR7.notification('We couldn\'t find <span class="smar7-badge">Add to cart button</span>. It seems product is not longer available', "error");
                            }
                        }, 500);
                    }, 500);
                } catch (e) {
                    let eventID = SMAR7.sentry.reportError(e, { method: 'orderItem' }),
                        msg = "Error occurred. We can help you out at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>.";

                    msg += " Error code: " + eventID;
                    SMAR7.notification(msg, "error");

                    return;
                }

                break;
            case "setShippingCompanies":
                var noty = SMAR7.notification("Setting proper shipping companies", "list");
                try {
                    var form = $(".main-wrapper tr.item-product .pnl-shipping form").eq(msg.productIndex);
                    // var form = $("tr[productid='"+msg.productId+"'] .pnl-shipping form");
                    var radio = form.find("input[value='" + msg.shippingCompany + "']");
                    if (radio.prop("checked")) {
                        port.postMessage({ status: "shippingSelected" });
                    } else {
                        radio.prop("checked", true);
                        form.find("input.btn-ok").click();
                    }
                } catch (e) {
                    noty.close();
                    var eventID = SMAR7.sentry.reportError(e, { method: 'setShippingCompanies' });
                    var msg = "Error occurred. We can help you out at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>.";
                    msg += " Error code: " + eventID;
                    SMAR7.notification(msg, "error");
                    return;
                }
                break;
            case "buyCart":
                SMAR7.notification("Accepting the cart", "cart");
                $("form[attr=buy-now-form]").submit();
                break;
            case "fillInShippingAddress":
                SMAR7.notification("Filling the shipping address in", "list");

                if ($(".sa-edit").length > 0) {
                    $(".sa-edit").get(0).click();
                }

            function setCity() {
                var eventBlur = new Event("blur");
                var eventChange = new Event("change");

                /*
                 * Wait for the Ali script to finish its job and populate
                 * city dropdown if it should be here
                 * Then set it
                 */
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        var city = $.trim(SMAR7.ucfirst(msg.shipping.city));

                        // If there's a select field, use it
                        if ($("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select").is(":visible")) {
                            if ($("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select option[value='" + city + "']").length) {
                                $("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select").val(city);
                            } else if ($("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select option[value='Other']")) {
                                $("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select").val("Other");
                            } else {
                                $.noty.closeAll();
                                setWarningMessage("Please complete the form manually as we're not able to for this country. Then contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>")
                                reject();
                            }
                            document.querySelector("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select").dispatchEvent(eventChange);
                            document.querySelector("div.sa-form-control.sa-form-field.sa-select-input.sa-city-wrapper select").dispatchEvent(eventBlur);
                        } else {
                            $("input[name='city']").val(city);
                            document.querySelector("input[name='city']").dispatchEvent(eventChange);
                            document.querySelector("input[name='city']").dispatchEvent(eventBlur);
                        }
                        resolve();
                    }, 500, msg);
                });
            }

                /*
                 * Ali script should be allowed to set province for previously
                 * set country. Let it by waiting shortly
                 */
                promise = new Promise(function (resolve) {
                    setTimeout(function () {
                        /*
                         * Since extensions's jQuery instance and Ali js are in
                         * different scopes, events triggered here by jQuery's
                         * methods doesn't affect a form. Use standard events
                         * instead
                         */
                        var eventChange = new Event("change");
                        var eventBlur = new Event("blur");

                        // First set all independent fields, to get prepared for possible errors on other ones
                        $("input[name='contactPerson']").val(msg.shipping.first_name + " " + msg.shipping.last_name);
                        $("input[name='address']").val(msg.shipping.address1);
                        $("input[name='address2']").val(msg.shipping.address2);
                        $("input[name='zip']").val(msg.shipping.zip);
                        if (null === msg.shipping.phone) {
                            $("input[name='phoneCountry']").val("+1");
                            $("input[name='mobileNo']").val("111111111");
                        } else {
                            $("input[name='phoneCountry']").val("+" + msg.shipping.phone.countryCode);
                            $("input[name='mobileNo']").val(msg.shipping.phone.nationalNumber);
                        }

                        $("select[name='country']").val(msg.shipping.country_code);
                        /*
                         * Trigger change event to let Ali script fill out
                         * province dropdown with data or make it input field.
                         */
                        document.querySelector("select[name='country']").dispatchEvent(eventChange);

                        document.querySelector("input[name='contactPerson']").dispatchEvent(eventBlur);
                        document.querySelector("select[name='country']").dispatchEvent(eventBlur);
                        document.querySelector("input[name='address']").dispatchEvent(eventBlur);
                        document.querySelector("input[name='address2']").dispatchEvent(eventBlur);
                        document.querySelector("input[name='province']").dispatchEvent(eventBlur);
                        document.querySelector("input[name='city']").dispatchEvent(eventBlur);
                        document.querySelector("input[name='zip']").dispatchEvent(eventBlur);
                        document.querySelector("input[name='mobileNo']").dispatchEvent(eventBlur);

                        resolve();
                    }, 500, msg);
                });

                promise.then(function () {
                    var eventBlur = new Event("blur");
                    var eventChange = new Event("change");

                    /*
                     * Wait for the Ali script to finish its job and populate
                     * province dropdown.
                     * Then set it
                     */
                    return new Promise(function (resolve, reject) {
                        setTimeout(function () {

                            // If there's a select field, use it
                            if ($("div.sa-form-control.sa-form-field.sa-select-input.sa-province-wrapper select").is(":visible")) {
                                if ($("div.sa-form-control.sa-form-field.sa-select-input.sa-province-wrapper select option[value='" + msg.shipping.province + "']").length) {
                                    $("div.sa-form-control.sa-form-field.sa-select-input.sa-province-wrapper select").val(msg.shipping.province);
                                    document.querySelector("div.sa-form-control.sa-form-field.sa-select-input.sa-province-wrapper select").dispatchEvent(eventChange);
                                    document.querySelector("div.sa-form-control.sa-form-field.sa-select-input.sa-province-wrapper select").dispatchEvent(eventBlur);
                                } else {
                                    $.noty.closeAll();
                                    SMAR7.notification("Please complete the form manually as we're not able to for this country. Then contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "error");
                                    reject();
                                }
                            } else {
                                var province = msg.shipping.province === null ? msg.shipping.city : msg.shipping.province;
                                $("input[name='province']").val(province);
                                document.querySelector("input[name='province']").dispatchEvent(eventChange);
                                document.querySelector("input[name='province']").dispatchEvent(eventBlur);
                            }

                            resolve();

                        }, 500, msg);
                    });
                }).then(setCity, setCity)
                    .then(function () {
                        // TODO: Send message about order completion?
                        $("a.ui-button.ui-button-primary.ui-button-medium.sa-confirm").get(0).click();
                    });
                break;
            case "placeOrder":
                // Fill in the message to seller
                $(".message-text").val(msg.messageToSeller);
                // Scroll to order details
                $('html, body').animate({
                    scrollTop: $(".order-title").offset().top
                });
                SMAR7.notification("Please check the order details and confirm it whenever you're ready", "warning");
                break;
            case "ordersDataIsTransferring":
                SMAR7.notification("Orders data is being transferred", "gear");
                break;
            case "ordersDataHasBeenStored":
                SMAR7.notification("Orders data has been stored", "success");
                break;
            case "ordersDataHasNotBeenStored":
                SMAR7.notification("Error occurred during order data transferring <br>Error code: 024", "error");
                break;
            case "closeAllNotifications":
                $.noty.closeAll();
                break;
            // ----------------- UI V2 ------------------//
            case "v2_resetCart":
                async function getItems() {
                    let items = {
                        selectAll: true,
                        selected: "",
                        _csrf_token_: SMAR7.ali.extractCsrf()
                    };

                    let rs = await window.fetch("https://shoppingcart.aliexpress.com/api/1.0/cart.do", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=UTF-8"
                        },
                        body: JSON.stringify(items)
                    });

                    let data = [];
                    rs = await rs.json();
                    rs.stores.forEach(function (rs) {
                        rs.storeList.forEach(function (rs) {
                            rs.products.forEach(function (rs) {
                                data.push(rs.itemId);
                            });
                        });
                    });

                    return data;
                }

                SMAR7.notification("Cart reset...", "gear");

                getItems().then(function (items) {
                    if (items.length > 0) {
                        SMAR7.ali.resetCart(items).then(function () {
                            port.postMessage({ status: "fulfillOrder", data: "" });
                        });
                    } else {
                        port.postMessage({ status: "fulfillOrder", data: "" });
                    }
                });

                break;
            case "v2_processCart":
                SMAR7.notification("Initializing Cart...", "gear");

                // Request AE Shoppingcart Cart
                window.fetch(SMAR7.ali.endpoint.shoppingcart, {
                    method: "GET", credentials: "include"
                }).then(function (rs) {
                    return rs.json()
                }).then(function (data) {
                    var cartIds = SMAR7.ali.filterCartIds(data, msg.products);
                    if (cartIds.length > 0) {
                        window.location.href = SMAR7.ali.endpoint.orderReview + cartIds.join(",");
                    } else {
                        SMAR7.notification("Error occurred trying to process Shopping Cart <br>Error code: 201", "error");
                    }
                }).catch(function (e) {
                    SMAR7.notification("Error occurred trying to process Shopping Cart <br>Error code: 202", "error");
                    console.log(e);
                });

                break;
            case "v2_setShippingAddressInsideAEDashboard":
                SMAR7.notification("Filling the shipping address in", "list");
                SMAR7.ali.populateShippingForm(msg.order.shipping);

                break;
            case "v2_setShippingAddress":
                if (msg.order.shipping.formError) {
                    SMAR7.ali.populateShippingForm(msg.order.shipping);
                    SMAR7.notification("Please complete the form manually as we're not able to for this country. Then contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>", "warning");

                    break;
                }
                if (msg.order.shipping.formFilled) {
                    SMAR7.ali.setSellerMessage(msg.order.preferences.message_to_seller).then(function () {
                        SMAR7.notification("Please check the order details and confirm it whenever you're ready", "warning");
                    });

                    break;
                }

                SMAR7.notification("Filling the shipping address in", "list");

                var cartIds = SMAR7.ali.parseCartIds();

				if (! cartIds) {
					cartIds = SMAR7.ali.parseCartIdsFromUrl();
				}

                var url = SMAR7.ali.endpoint.ordersAPI + "?itemIds=" + cartIds + "&aeOrderFrom=main_shopcart";

                window.fetch(url).then(function (e) {
                    return e.json()
                }).then(async function (rs) {

	                if (! rs.success) {
		                SMAR7.notification("Error occurred trying to fill shipping address <br>Error code: 205", "error");
		                return;
	                }

                    await SMAR7.ali.removeExistingAddresses(rs);
                    var countryData = await SMAR7.ali.getProvinceAndCities(msg.order.shipping);

                    var address = await SMAR7.ali.addAddress(countryData, msg.order.shipping);
                    if (address.status === 'error') {
                        // SMAR7.notification("Trying to add address via profile Aliexpress dashboard", "warning");
                        //window.location.href = SMAR7.ali.endpoint.manageAddress;
                        browser.runtime.sendMessage({ action: 'v2_formError' }, function (response) {
                            window.location.reload();
                        });

                        return;
                    }

                    await SMAR7.ali.saveShippingMethod(rs, address.id, msg.order.shippingMethodId);
                    browser.runtime.sendMessage({ action: 'v2_formFilled' }, function (rs) {
                        window.location.reload();
                    });
                });

                break;
        }
    });
});

// Messages from settings popup.
// SMAR7.ali.routeMessage defined in /content/commons.js
browser.runtime.onMessage.addListener(SMAR7.ali.routeMessage);

function setProcessingMessage(text) {
    var logoURL = browser.extension.getURL("images/package16.png");
    var loadingURL = browser.extension.getURL("images/settings.png");
    return noty({
        text: "\
            <div class='status-title'>\
                <img src='" + logoURL + "'/>&nbsp;&nbsp;<span>SMAR7 Express</span>\
            </div>\
            <div class='status-image rotatable'>\
                <img src='" + loadingURL + "'/>\
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
}


$(function () {
    addImportButton();
    SMAR7.loadFonts();

    $(".smar7-express-button").on("click", async function (event) {
        const domain = await SMAR7.utils.getStoreDomain();
        if (!domain) {
            const msg = "Before importing products, you must <strong>connect</strong> the" +
                " extension to your store. Open SMART Express and look for the <strong>Connect Extension</strong> button";
            SMAR7.notification(msg, "warning");
            return;
        }

        // Show message that product is being uploaded
        SMAR7.notification("Product is being transferred to <strong>Shopify</strong> <span class=\"domain-name\">" + domain.name + "</span>", "gear");

        //  Getting Item Data
        if ($(".product-action").length) {
            // New Aliexpress UI
            const itemData = newUiImport();
            SMAR7.importItem(itemData);
        } else {
            // OLD Aliexpress UI

            // GEt product ID
            let match = window.location.href.match(/\/(\d*)\.html/);
            const productId = match[1];

            // Try to do import from NEW UI page
            const supplierLink = `https://ru.aliexpress.com/item/${productId}.html`;
            browser.runtime.sendMessage(undefined, {
                action: "getItemData",
                url: supplierLink
            }, undefined, function (rs) {
                if (rs.status === "success") {
                    // Check if new UI anyway - sly aliexpress developers could switch UI back
                    const newUI = rs.content.indexOf("productSKUPropertyList") >= 0;
                    if (newUI) {
                        const itemData = newUiImport(rs.content);
                        SMAR7.importItem(itemData);
                    } else {
                        const itemData = oldUiImport();
                        SMAR7.importItem(itemData);
                    }
                }
            });
        }
    });
});

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setFailMessage(text) {
    if (undefined === text) {
        var text = "Error occurred! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
    }
    var logoURL = browser.extension.getURL("images/package16.png");
    var errorURL = browser.extension.getURL("images/cancel.png");
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + errorURL + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: null,
        closeWith: ['button'],
    });
}

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setWarningMessage(text) {
    if (undefined === text) {
        var text = "Error occurred! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
    }
    var logoURL = browser.extension.getURL("images/package16.png");
    var errorURL = browser.extension.getURL("images/warning.png");
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + errorURL + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: null,
        animation: {
            open: 'noty_effects_open',
            close: null,
        }
    });
}

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setSuccessMessage(text) {
    var logoURL = browser.extension.getURL("images/package16.png");
    var tickURL = browser.extension.getURL("images/checked.png");
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + tickURL + "'/>\
            </div>\
            <div class='status-text'>\
                <p>" + text + "</p>\
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
    var loadingURL = browser.extension.getURL("images/sm7_gear.png");
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMAR7</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + loadingURL + "'/>\
            </div>\
            <div class='status-text'>\
                <p>Product is being transferred to <strong>Shopify</strong></p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        animation: {
            open: 'noty_effects_open',
            close: null
        }
    });
}

function addImportButton() {
    const iconLink = browser.extension.getURL("images/down-arrow.png");

    let $container = $('.product-action-main').length ? $('.product-action-main') : $('.product-action');

    $container.append("\
        <div class='smar7-express-button new-ui'>\
            <img src='" + iconLink + "'><span>Import to Shopify</span>\
        </div>\
    ");
    $(".smar7-express").show();
}

function retrieveWindowVariables(variables) {
    var ret = {};

    var scriptContent = "";
    for (var i = 0; i < variables.length; i++) {
        var currVariable = variables[i];
        scriptContent += "if (typeof " + currVariable + " !== 'undefined') document.body.setAttribute('tmp_" + currVariable + "', " + currVariable + ");\n"
    }

    var script = document.createElement('script');
    script.id = 'tmpScript';
    script.appendChild(document.createTextNode(scriptContent));
    (document.body || document.head || document.documentElement).appendChild(script);

    for (var i = 0; i < variables.length; i++) {
        var currVariable = variables[i];
        ret[currVariable] = $("body").attr("tmp_" + currVariable);
        $("body").removeAttr("tmp_" + currVariable);
    }

    $("#tmpScript").remove();

    return ret;
}
