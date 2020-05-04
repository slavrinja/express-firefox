browser.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {
        switch (msg.action) {
            case "orderItem":
                setProcessingMessage("Adding the product to the cart");

                try {
                    // check if new Ali UI used
                    let newUI = !$("#j-p-quantity-input").length;

                    // Set quantity
                    if (newUI) {
                        // Setting input value is failing by Ali focus protect script
                        // $(".product-number-picker").find('input').val(msg.quantity);

                        // So just clicking needed number (starting from 1 already)
                        for (var i = 0; i < msg.quantity - 1; i++) {
                            $(".product-number-picker").find('.next-after button').click();
                        }
                    } else {
                        $("#j-p-quantity-input").val(msg.quantity);
                    }

                    // set variants
                    if (msg.options && (msg.options.length > 0)) {
                        var options = msg.options.split(",");

                        if (newUI) {
                            let itemData = newUiImport();
                            if (!($.isEmptyObject(itemData.options))) {
                                for (let i in options) {
                                    const sku = options[i];
                                    const values = itemData.options[i].values;
                                    let index = values.findIndex(value => `${value.sku}` === `${sku}`);

                                    if (index !== -1) {
                                        const opindex = parseInt(i, 10) + 1;
                                        const varindex = parseInt(index, 10) + 1;

                                        const sel = $(`.sku-property:nth-of-type(${opindex})`).find(`.sku-property-item:nth-of-type(${varindex})`);

                                        if (sel.length && values.length > 1) {
                                            sel.click().addClass('selected');
                                        } else {
                                            console.log("error in select variants (" + i + ")");
                                        }
                                    } else {
                                        console.log("error in select variants (" + i + ")");
                                    }
                                }
                            }
                        } else {
                            options.forEach(function (current, index) {
                                var optionElement = $("#j-product-info-sku ul").eq(index).find("a[data-sku-id='" + current + "']");
                                var parentLi = optionElement.parent();
                                if (parentLi.length > 0 && parentLi.hasClass('active')) {
                                } else {
                                    if (optionElement.length > 0) {
                                        optionElement.get(0).click();
                                    }
                                }
                            });
                        }
                    }

                    // Submit BuyNow form
                    setTimeout(function () {
                        if (newUI) {
                            // Click for select  shipping method
                            if (
                                msg.shippingMethodId !== "" &&
                                $(".logistics").find(".logo-" + msg.shippingMethodId.toLowerCase()).length
                            ) {
                                $(".logistics").find(".logo-" + msg.shippingMethodId.toLowerCase())
                                    .parents(".table-tr")
                                    .find("label").click();

                                // Apply form
                                setTimeout(function () {
                                    $(".logistics").parents(".next-dialog").find('.next-btn').click();
                                }, 500);
                            }

                            // Submit BuyNow form
                            setTimeout(function () {
                                if ($(".product-action").find(".buynow").length > 0) {
                                    $(".product-action").find(".buynow").click();
                                    setTimeout(function () {
                                        port.postMessage({ status: "itemOrdered" });
                                    }, 700);
                                } else {
                                    SMAR7.notification('we couldn\'t find <span class="smar7-badge">Add to cart button</span>. It seems product is not longer available', "error");
                                }
                            }, 500);
                        } else {
                            // Set hidden field of the shipping method
                            $("form#buy-now-form input[name='shippingCompany']").val(msg.shippingMethodId);

                            // Submit BuyNow form
                            if ($("#j-add-cart-btn").length > 0) {
                                $("#j-add-cart-btn").get(0).click();
                                setTimeout(function () {
                                    port.postMessage({ status: "itemOrdered" });
                                }, 700);
                            } else {
                                SMAR7.notification('we couldn\'t find <span class="smar7-badge">Add to cart button</span>. It seems product is not longer available', "error");
                            }
                        }
                    }, 500);
                } catch (e) {
                    var eventID = SMAR7.sentry.reportError(e, { method: 'orderItem' });
                    var msg = "Error occurred. We can help you out at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>.";
                    msg += " Error code: " + eventID;
                    SMAR7.notification(msg, "error");
                    return;
                }

                break;
            case "buyCart":
                setProcessingMessage("Accepting the cart");
                $("form[attr=buy-now-form]").submit();
                break;
            case "fillInShippingAddress":
                setProcessingMessage("Filling the shipping address in");
                $(".sa-edit").get(0).click();
                $("select[name='country']").val(msg.shipping.country_code);
                $("input[name='phoneCountry']").val("");
                $("input[name='phoneArea']").val("");
                $("input[name='phoneNumber']").val("");
                var event = new Event("change");
                document.querySelector("select[name='country']").dispatchEvent(event);
                $("input[name='province']").val(msg.shipping.province).change();
                $("input[name='contactPerson']").val(msg.shipping.first_name + " " + msg.shipping.last_name).change();
                $("input[name='address']").val(msg.shipping.address1);
                $("input[name='address2']").val(msg.shipping.address2);
                $("input[name='city']").val(msg.shipping.city);
                $("input[name='zip']").val(msg.shipping.zip);
                console.log(msg.shipping.phone);
                if (null === msg.shipping.phone) {
                    console.log("111");
                    $("input[name='mobileNo']").val("111111111");
                } else {
                    console.log("phone");
                    $("input[name='mobileNo']").val(msg.shipping.phone);
                }
                setTimeout(function () {
                    $("div.sa-form-control.sa-form-field.sa-select-input.sa-province-wrapper select").val(msg.shipping.province).change();
                    // TODO: Send message about order completion?
                    $("a.ui-button.ui-button-primary.ui-button-medium.sa-confirm").get(0).click();
                }, 3000, msg);
                break;
            case "placeOrder":
                $("#place-order-btn").click();
                break;
        }
    });
});

/**
 * Deprecated: Use SMAR7.notification instead
 */
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
        var domain = await SMAR7.utils.getStoreDomain();
        if (!domain) {
            let msg = "Before importing products, you must <strong>connect</strong> the extension to your store. Open SMART Express and look for the <strong>Connect Extension</strong> button";
            SMAR7.notification(msg, "warning");
            return;
        }

        // Show message that product is being uploaded
        SMAR7.notification("Product is being transferred to <strong>Shopify</strong>", "gear");

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
        var text = "Error occured! Please contact us at <a href='https://smar7apps.com/support' target='_blank'>smar7apps.com</a>";
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
        timeout: 6000
    });
}

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setSuccessMessage() {
    var logoURL = browser.extension.getURL("images/package16.png");
    var tickURL = browser.extension.getURL("images/checked.png");
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMART</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image'>\
                <img src='" + tickURL + "'/>\
            </div>\
            <div class='status-text'>\
                <p>Product has been successfully imported to Shopify</p>\
            </div>",
        layout: "topRight",
        theme: "relax",
        timeout: 3000
    });
}

/**
 * Deprecated: Use SMAR7.notification instead
 */
function setLoadingMessage() {
    var logoURL = browser.extension.getURL("images/package16.png");
    var loadingURL = browser.extension.getURL("images/loading.png");
    return noty({
        text: "\
            <div class='status-header'>\
                <span class='sm7-title'>SMART</span>\
                <span class='sm7-subtitle'>Express</span>\
            </div>\
            <div class='status-image rotatable'>\
                <img src='" + loadingURL + "'/>\
            </div>\
            <div class='status-text'>\
                <p>Product is being transferred to Shopify</p>\
            </div>",
        layout: "topRight",
        theme: "relax"
    });
}

function addImportButton() {
    var iconLink = browser.extension.getURL("images/down-arrow.png");

    $(".product-action-main").append("\
        <div class='smar7-express-button'>\
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
