/* globals newUiImport chrome SMAR7 */
$(function () {
    // When extension is enabled, warning about its absence will disappear
    $(".tip-container").attr("data-chr-extension", "ready");

    // Event handler for ordering products in supplier's store
    $("body").on("click", ".order-items, .individual-order", function () {
        // We use JQuery attr() function instead of data() one because of
        // jQuery doesn't recognize data-attributes values that render by Vue
        // for some reason. The possible reason is that we mix attr() and data()
        // calls in the same scope.
        const supplier = $(this).attr("data-supplier");
        const orderAll = $(this).hasClass("order-items");
        const orderId = $(this).attr("data-orderid");
        const productId = $(this).attr("data-product-id");
        const sku = $(this).attr("data-sku");
        const msg = orderAll ?
            "Something went wrong when trying to order products for this order." :
            "Something went wrong when trying to order this product.";

        $.get("/orders/getdata/" + orderId, function (response) {
            const len = response.products.length - 1;

            if (response.status === "ERROR") {
                alert(response.msg);
                return;
            }

            if (orderAll) {
                // Remove other supplier entries
                for (let i = len; i >= 0; i--) {
                    if (typeof response.products[i].supplier !== "undefined") {
                        if (response.products[i].supplier !== supplier) {
                            response.products.splice(i, 1);
                        }
                    } else if (supplier !== SMAR7.suppliers.aliexpress) {
                        // if supplier is not defined it's aliexpress for sure
                        response.products.splice(i, 1);
                    }
                }
            } else {
                // Remove all other product and keep just current one
                for (let i = len; i >= 0; i--) {
                    if (String(response.products[i].product_id) !== productId ||
                        String(response.products[i].sku) !== sku) {
                        response.products.splice(i, 1);
                    }
                }
            }

            browser.runtime.sendMessage({ action: "resetCart", data: response }, function (rs) {
            });
        }).fail(function () {
            alert(msg);
        });
    });

    // Dashboard event handler for getting order tracking number
    $("body").on("click", ".track-refresh", function () {
        let event;
        const button = this;

        /* TODO: USE attr() instead of data() because for some reason
            jQuery doesn't see data-attributes values reloaded by Vue */
        browser.runtime.sendMessage({
            action: "getOrderShippingData",
            internalOrderId: $(button).attr("data-orderid")
        }, function (response) {
            if (response.status === "ok") {
                event = new CustomEvent("shippingOk", {
                    bubbles: true,
                    cancelable: true
                });
            } else {
                const failedList = (response.failedList !== undefined) ? response.failedList : [];
                event = new CustomEvent("shippingError", {
                    detail: {
                        response: response.status,
                        failedList
                    },
                    bubbles: true,
                    cancelable: true
                });
            }
            if (button.closest(".s7listener").dispatchEvent(event) === false) {
                // console.log('Event was cancelled by preventDefault() call');
            }
        });
    });

    /*
     * This is implemented here because the extension has a permission for
     * cross-origin requests to all URLs set in manifest file
     * TODO: remove after release of connect tab. Deprecated
     */
    $(document).on("click", ".edit-connection, .map-products-button", function (event) {
        const target = $(event.target);
        const buttonPressed = this;
        const newConnection = target.is(".map-products-button");
        let supplierLink,
            productId;

        if (newConnection) {
            supplierLink = $(buttonPressed)
                .closest(".smar7-container-fluid")
                .find("input.supplier-link-query").val();
            productId = $(".products-selection .product-search-item.selected-item")
                .data("productid");
        } else {
            supplierLink = $(buttonPressed)
                .parent().parent()
                .find(".supplier-anchor")
                .attr("href");
            productId = $(buttonPressed).closest(".product-item")
                .data("productid");
        }

        const supplier = "aliexpress";
        supplierLink = supplierLink.replace(/http:/, "https:");

        /*
         * To show loading spinner AND start Shopify loading bar, we cannot
         * start it here, because Shopify is in different scope. So we have to
         * fire an event. We cannot use jQuery to do this because that's the
         * different instance than the one on the scripts we utilize on the page.
         * So we create a custom event with native JS.
         *
         * TODO: For some reason when the event is dispatched on the button
         * it cannot be caught by _delegated_ event listener on the page.
         * So it's necessary to fire it on the static container
         */
        if (!newConnection) {
            buttonPressed.closest(".whitey").dispatchEvent(new CustomEvent(
                "loadingStarted",
                { detail: productId }
            ));
        }

        browser.runtime.sendMessage(undefined, {
            action: "getItemData",
            url: supplierLink
        }, undefined, function (rs) {
            if (rs.status === "success") {
                const itemData = UTILS[supplier].itemData(rs.content, supplierLink);

                // Send all the data to the server to build a popup for mapping products
                const externalId = UTILS[supplier].productId(supplierLink);

                if (externalId <= 0) {
                    alert("SMART Express app can't map this product. Contact our support team"
                        + " to help you with this issue.");
                    return;
                }

                const params = {
                    supplier,
                    supplierItemId: externalId,
                    supplierItemOptions: itemData.options,
                    image: itemData.image,
                    shopifyProductId: productId
                };

                $.post("/products/mappingform", params, function (response) {
                    $(".overlay .search-results.products-list").html(response.html);

                    UTILS[supplier].updateForm();

                    /*
                     * Fire a custom event. Since jQuery instance doesn't match the one
                     * for the Connect Products page, use native js event
                     */
                    document.querySelector(".overlay").dispatchEvent(new Event("contentchanged"));

                    if (!newConnection) {
                        buttonPressed.closest(".whitey").dispatchEvent(
                            new CustomEvent("loadingEnded", { detail: productId }));
                    }
                });
            } else {
                if (!newConnection) {
                    buttonPressed.closest(".whitey").dispatchEvent(
                        new CustomEvent("loadingFailed", { detail: productId })
                    );
                } else {
                    $(buttonPressed).prevAll(".whitey").get(0).dispatchEvent(
                        new CustomEvent("loadingFailed", { detail: productId })
                    );
                }
            }
        });
    });

    // Update or create new connection to supplier's product
    $(document).on("click", ".change-connection, .tab-variants", function (event) {
        //  send loading event
        document.querySelector(".s7-conpopup").dispatchEvent(
            new CustomEvent("ceProductInfoLoading")
        );

        let supplierLink;
        const externalId = $(this).attr("data-supplier-id");
        const supplier = $(this).attr("data-supplier");
        const productId = $(this).attr("data-shopify-id");
        const reConnection = $(this).attr("data-reconnection");
        const cleanData = $(this).attr("data-clean") || false;

        // DRY-hack: Change Aliexpress product url to new UI version
        if (externalId !== "" && supplier === "aliexpress") {
            supplierLink = `https://aliexpress.com/item/${externalId}.html`;
        } else {
            // if not-  get url from data-attribute
            supplierLink = $(this).attr("data-supplier-link").replace("http:", "https:");
        }

        try {
            browser.runtime.sendMessage(undefined, {
                action: "getItemData",
                url: supplierLink,
                id: externalId
            }, undefined, function (rs) {
                if (rs.status === "success") {
                    let itemData;
                    const newUI = rs.content.indexOf("productSKUPropertyList") >= 0;

                    // Check if new UI anyway - sly aliexpress developers could switch UI back
                    if (supplier === "aliexpress" && newUI) {
                        itemData = newUiImport(rs.content);
                    } else {
                        itemData = UTILS[supplier].itemData(rs.content, supplierLink);
                    }

                    // Check if product page Waiting for verification
                    if (rs.content.search("ui-unusual") !== -1) {
                        document.querySelector(".s7-conpopup").dispatchEvent(
                            new CustomEvent("ceProductWaitVerify",
                                {
                                    detail: {
                                        link: supplierLink
                                    }
                                })
                        );
                        return;
                    }

                    // Send all the data to the server to build a popup for mapping products
                    var externalId = UTILS[supplier].productId(supplierLink);

                    // Note if getting item data failed
                    if (externalId <= 0) {
                        document.querySelector(".s7-conpopup").dispatchEvent(
                            new CustomEvent(
                                "ceProductInfoFailed",
                                {
                                    detail: {
                                        message: "Smar7 Express app can't map this product. "
                                            + "Check the link is correct and contact our support team"
                                            + " to help you with this issue."
                                    }
                                }
                            )
                        );

                        return;
                    }

                    // Get image data
                    let image = "";
                    if (itemData.image !== undefined && itemData.image !== "") {
                        image = itemData.image;
                    }
                    if (image === ""
                        && itemData.images !== undefined
                        && itemData.images[0] !== undefined
                        && itemData.images[0].src !== undefined
                    ) {
                        image = itemData.images[0].src;
                    }

                    // Create new or update existing connection data
                    document.querySelector(".s7-conpopup").dispatchEvent(
                        new CustomEvent(
                            "ceProductInfoLoaded",
                            {
                                detail: {
                                    supplierItemId: externalId,
                                    supplierItemOptions: itemData.options,
                                    image,
                                    supplier,
                                    shopifyProductId: productId,
                                    itemData,
                                    cleanData,
                                    reConnection
                                }
                            }
                        )
                    );
                } else {
                    document.querySelector(".s7-conpopup").dispatchEvent(
                        new CustomEvent(
                            "ceProductInfoFailed",
                            {
                                detail: {
                                    message: "Smar7 Express app can't map this product. "
                                        + "Contact our support team to help you with this issue.",
                                }
                            }
                        )
                    );
                    console.log(rs);
                }
            });
        } catch (e) {
            document.querySelector(".s7-conpopup").dispatchEvent(
                new CustomEvent(
                    "ceProductInfoFailed",
                    {
                        detail: {
                            message: "Extension context invalidated. Try to reload page and repeat your action."
                        }
                    }
                )
            );
            console.log("Extension context invalidated. Try to reload page and repeat your action");
            console.log(e);
        }
    });

    // And reveal all the fields of the dashboard
    $("#demo").css("opacity", 1);

    /*  Checking if store is attached to extension */
    // TODO: Read store domain from DOM is not secure. Implement a different approach
    const $domain = $(".ext-hookup-point");

    SMAR7.utils.getStoreDomain($domain.val()).then(function (result) {
        $domain.attr("data-status", result ? "connected" : "disconnected");
    });

    const attatchHookupEventHandler = function () {
        // Show/Enable attach extension button
        $(".ext-hookup-container").show(); // TODO: remove after oTTo code base release

        $("#ext-hookup-button")
            .removeClass("is-disabled")
            .click(function () {
                SMAR7.utils.setStoreDomain($domain.val()).then(function (result) {
                    if (result) {
                        $domain.attr("data-status", "connected");
                    }
                });
            });
    };

    const attempts = { done: 0, max: 10 };
    const isVueLoaded = function () {
        if ($("#ext-hookup-button").length > 0 || attempts.done >= attempts.max) {
            attatchHookupEventHandler();
        } else {
            attempts.done += 1;
            setTimeout(isVueLoaded, 400);
        }
    };
    isVueLoaded();

    /* Helper Functions */
    const UTILS = {
        aliexpress: {
            itemData: function (content, url) {
                // check if new Ali UI used
                const newUI = content.indexOf("productSKUPropertyList") >= 0;

                if (newUI) {
                    return newUiImport(content);
                } else {
                    // Old design version
                    return {
                        // All possible options
                        options:
                            $(content).find("#j-product-info-sku .p-property-item .p-item-title").map(function () {

                                // Remove colon from an option name
                                let str = $(this).html();
                                str = str.substr(0, str.length - 1);
                                const valArr = [];

                                // Get options title, image and SKU
                                $(this).closest(".p-property-item").find(".sku-attr-list a").each(function () {
                                    const title = ($(this).attr("title") === undefined) ? $(this).text() : $(this).attr("title");
                                    const img = ($(this).find("img").length > 0) ? $(this).find("img").attr("src") : null;
                                    valArr.push({
                                        sku: $(this).data("sku-id"),
                                        title,
                                        img
                                    });
                                });

                                return { name: str, values: valArr };
                            }).get(),
                        image:
                            $(content).find(".ui-image-viewer-thumb-frame img").attr("src")
                    };
                }
            },

            productId: function (url) {
                const match = url.match(/\/((\d|\_)*)\.html/);

                if (!match) {
                    return 0;
                }

                if (typeof match[1] !== "undefined") {
                    // Check store aliexpress identifier
                    // For instance: https://www.aliexpress.com/store/product/.../2667136_32832715844.html
                    const parts = match[1].split("_");
                    if (parts.length > 1) {
                        return parts[1];
                    }
                    return match[1];
                }

                return 0;
            },

            updateForm: function () {
                $(".map-supplier").html("Ali Express");
            }
        }
    };
});
