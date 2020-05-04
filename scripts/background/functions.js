var SMAR7 = {
    afActive: true,
    aeuCid: 'u7u7qRN',

    ali: {
        endpoint: {
            'orderReview': 'https://shoppingcart.aliexpress.com/orders.htm?aeOrderFrom=main_shopcart&availableProductShopcartIds=',
            'deleteAddress': 'https://ilogisticsaddress.aliexpress.com/ajaxDeleteLogisticsAddress.htm',
            'saveAddress': 'https://ilogisticsaddress.aliexpress.com/ajaxSaveOrUpdateBuyerAddress.htm',
            'countries': 'https://ilogisticsaddress.aliexpress.com/AjaxQueryCountries',
            'shoppingcart': 'https://shoppingcart.aliexpress.com/api/1.0/cart.do',
            'ordersAPI': 'https://shoppingcart.aliexpress.com/api/1.0/orders.htm',
            'ordersService': 'https://shoppingcart.aliexpress.com/api/1.0/orders/service.do',
            'shippingMethods': 'https://freight.aliexpress.com/ajaxFreightCalculateService.htm',
            'manageAddress': 'https://ilogisticsaddress.aliexpress.com/addressList.htm'
        },

        page: {
            /**
             * @return boolean       Whether or not the url being validated is the product page
             * @param url
             */
            isItem: function (url) {
                if (url.length < 1) {
                    return false;
                }

                var etsyRegex = /^.*(.*aliexpress\.com)\/(.*\/item|item\/)(.*)/;
                var matches = url.match(etsyRegex);

                return (matches && matches[1] == 'aliexpress.com');
            },

            isCart: function (url) {
                return url.indexOf("https://shoppingcart.aliexpress.com/shopcart/shopcartDetail") > -1;
            },

            isReview: function (url) {
                return url.indexOf("https://shoppingcart.aliexpress.com/orders") > -1;
            },

            isManageAddress: function (url) {
                return url.indexOf(SMAR7.ali.endpoint.manageAddress) > -1;
            }
        },

        isProductInOrder: function (id, products) {
            return products.find(function (item) {
                return item.external_id == id;
            });
        },

        getShippingMethod: function (productId, countryCode, ePacket) {
            return new Promise((resolve, reject) => {
                let url = SMAR7.ali.endpoint.shippingMethods + "?callback=&productid=" + productId + "&country=" + countryCode + "&province=&city=&count=1&f=d&currencyCode=USD";
                $.ajax({
                    dataType: "text",
                    method: "get",
                    url: url,
                    success: function (result) {
                        result = result.substr(1);
                        result = result.substr(0, result.length - 1);
                        result = jQuery.parseJSON(result);

                        // Find out what option is ePacket and what's the cheapest one
                        let ePacketId = "",
                            cheapestId = "";
                        result['freight'].some(function (element, index) {
                            // Usually the first element is the cheapest one
                            if (0 === index) {
                                cheapestId = element.company;
                            }

                            if ("ePacket" === element.companyDisplayName) {
                                ePacketId = element.company;
                            }
                        });

                        resolve((ePacketId && ePacket) ? ePacketId : cheapestId);
                    }
                });
            });
        },

        extractCsrf: function () {
            let active = true,
                finished = false,
                error = void(0),
                iterator = document.body.querySelectorAll("script")[Symbol.iterator]();

            try {
                for (
                    let nextValue;
                    !(active = (nextValue = iterator.next()).done);
                     active = true) {

                    let item = nextValue.value,
                        token = item.innerText.match(/\._csrf_token_\s=\s'(\w+)';/);

                    if (null !== token) {
                        return token[1];
                    }
                }
            } catch (e) {
                finished = true, error = e;
            } finally {
                try {
                    !active && iterator.return && iterator.return()
                } finally {
                    if (finished) {
                        throw error;
                    }
                }
            }

            return null
        },

        filterCartIds: function (rs, products) {
            var data = [];
            if (rs.stores && rs.stores.forEach(function (rs) {
                rs.storeList.forEach(function (rs) {
                    rs.products.forEach(function (rs) {
                        if (SMAR7.ali.isProductInOrder(rs.productId, products)) {
                            data.push({
                                productId: rs.productId,
                                skuAttr: rs.skuAttr,
                                quantity: rs.count,
                                shoppingCartId: rs.itemId
                            });
                        }
                    })
                })
            }), data.length > 0) {

                return data.map(function (rs) {
                    return rs.shoppingCartId
                });
            }

            return data;
        },

        parseCartIds: function () {
            let active = true,
                finished = false,
                error = void(0),
                iterator = document.body.querySelectorAll("script")[Symbol.iterator]();

            try {
                for (
                    let nextValue;
                    !(active = (nextValue = iterator.next()).done);
                    active = true) {

                    let item = nextValue.value,
                        cartId = item.innerText.match(/availableProductShopcartIds":\s"([\d,]+)",/);

                    if (null !== cartId) {
                        return cartId[1];
                    }
                }
            } catch (e) {
                finished = true, error = e;
            } finally {
                try {
                    !active && iterator.return && iterator.return();
                } finally {
                    if (finished) {
                        throw error;
                    }
                }
            }

            return null;
        },

        parseCartIdsFromUrl: function() {
			const urlParams = new URLSearchParams(window.location.search);
            const shopCartIds = urlParams.get('availableProductShopcartIds');

            return shopCartIds;
        },

        resetCart: function(cartIds) {
            return new Promise(function (resolve, reject) {
                let items = {
                    action: "DELETE_ITEMS",
                    updates: [],
                    selected: "",
                    _csrf_token_: SMAR7.ali.extractCsrf()
                };

                cartIds.forEach(function (cartId) {
                    items.updates.push({
                        quantity: 0,
                        itemId: cartId
                    })
                });

                try {
                    window.fetch(SMAR7.ali.endpoint.shoppingcart, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=UTF-8"
                        },
                        body: JSON.stringify(items)
                    }).then(function (rs) {
                        SMAR7.notification('Cart is cleared successfully!');
                        resolve(true);
                    });
                } catch (e) {
                    reject(e);
                }
            });
        },

        removeExistingAddresses: function (rs) {
            if (!rs || !rs.shipping || !rs.shipping.availableShippingMethods) {
                return Promise.resolve(null);
            }

            var shippingMethods = rs.shipping.availableShippingMethods;

            if (shippingMethods.length < 1) {
                return Promise.resolve(null);
            }

            var items = shippingMethods.filter(function (item) {
                return item.isDefault === false;
            });

            return Promise.all(items.map(function (item) {
                var url = SMAR7.ali.endpoint.deleteAddress + "?addressId=" + item.shippingMethodId + "&_csrf_token_=" + SMAR7.ali.extractCsrf();
                return window.fetch(url);
            }));
        },

        getProvinceAndCities: function (shipping) {
            return new Promise(async function (resolve, reject) {
                let url = SMAR7.ali.endpoint.countries + "?country=" + shipping.country_code + "&callback=__jp4&features=" + JSON.stringify({locale: "en_US"});
                try {
                    window.fetch(url, {method: "GET", credentials: "include"}).then(function (rs) {
                        return rs.text();
                    }).then(function (rs) {
                        let country = rs.replace(/"p?c":"[\d|\w]*",/g, "");
                        country = country.replace("__jp4(", "")
                            .slice(0, -1);
                        let items = JSON.parse(country);
                        items && items.addressList && resolve(items.addressList), resolve([]);
                    });
                } catch (e) {
                    reject(e);
                }
            });
        },

        addAddress: function (countryData, shipping) {
            var phoneCountryCode = '';
            if (typeof SMAR7.utils.phoneCodeByCountry[shipping.country_code] != 'undefined') {
                phoneCountryCode = SMAR7.utils.phoneCodeByCountry[shipping.country_code];
            }

            // Find region and city from AE result
            var location = SMAR7.ali.findRegionAndCity(countryData, shipping);

            if (shipping.phone === null) {
                shipping.phone = "000000";
            } else {
                shipping.phone = shipping.phone.nationalNumber.replace(/[^0-9.]/g, '');
            }

            var params = {
                _csrf_token_: SMAR7.ali.extractCsrf(),
                contactPerson: shipping.name,
                country: shipping.country_code,
                province: location.region,
                city: location.city,
                address: shipping.address1,
                address2: shipping.address2,
                zip: shipping.zip,
                isDefault: true,
                features: JSON.stringify({locale: "en_US"}),
                mobileNo: shipping.phone,
                phoneCountry: phoneCountryCode
            };

            return SMAR7.ali.setAEAddress(params).then(function (rs) {
                if (rs.success) {
                    return Promise.resolve({
                        'status': 'ok',
                        'id': rs.id
                    });
                }

                if (rs.fieldErrorMessageList) {
                    var msg = "Something went wrong. Contact our support team";

                    if (rs.fieldErrorMessageList.length > 0) {
                        msg = rs.fieldErrorMessageList.map(function (item) {
                            return item.errorMessage
                        }).join(",");
                    }

                    return Promise.resolve({
                        'status': 'error',
                        'msg': msg
                    });
                }

                return Promise.resolve({
                    'status': 'error',
                    'msg': 'Undefined error setting shipping address'
                });
            }).catch(function (e) {
                return Promise.resolve({
                    'status': 'error',
                    'msg': e.message
                });
            })
        },

        setAEAddress: function (params) {
            var body = new URLSearchParams;

            Object.keys(params).forEach(function (r) {
                return body.append(r, params[r]);
            });

            return window.fetch(SMAR7.ali.endpoint.saveAddress, {
                method: "POST",
                body: body
            }).then(function (e) {
                return e.json()
            });
        },

        saveShippingMethod: function (rs, addressId, shippingMethodId) {
	        const shopCartIds = SMAR7.ali.parseCartIdsFromUrl();

            let requests = [];

            rs.orders.forEach(function (order) {
                order.storeList.forEach(function (store) {
                    store.products.forEach(function (product) {

                        let data = {
                            acrossStoreCoupons: [],
                            sellerCouponList: [],
                            aeOrderFrom: "main_shopcart",
                            availableProductShopCartIds: shopCartIds,
                            itemId: product.itemId,
                            productId: product.productId,
                            selectedAddressId: addressId,
                            shippingCompany: shippingMethodId,
                            _csrf_token_: SMAR7.ali.extractCsrf()
                        };

                        requests.push(window.fetch(SMAR7.ali.endpoint.ordersService, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json; charset=UTF-8"
                            },
                            body: JSON.stringify(data)
                        }));
                    })
                })
            });

            return new Promise(function (resolve) {
                Promise.all(requests).then(function () {
                    resolve();
                })
            });
        },

        setSellerMessage: function (msg) {
            var self = this;
            var selector = {
                'noteContainer': '.seller-message .seller-message-input',
                'noteInput': '.seller-message textarea[ae_button_type="message"]'
            };

            return new Promise(function (resolve, reject) {
                if (document.querySelectorAll(selector.noteContainer).length > 0
                    && document.querySelectorAll(selector.noteInput).length > 0) {

                    document.querySelectorAll(selector.noteContainer).forEach(function (item) {
                        item.click();
                        item.className = item.className.replace("folded", "unfolded");
                    });

                    setTimeout(function () {
                        document.querySelectorAll(selector.noteInput).forEach(function (element) {
                            var descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
                            descriptor.set.call(element, msg);
                            element.dispatchEvent(new Event("change", {
                                bubbles: true
                            }));
                        });
                        setTimeout(function () {
                            resolve(true);
                        }, 500);
                    }, 300);
                } else {
                    resolve(false);
                }
            });
        },

        populateShippingForm: async function (shipping) {
            console.log(shipping);
            await SMAR7.utils.setInputField('[name="contactPerson"]', shipping.name);
            await SMAR7.utils.setInputField('[name="mobileNo"]', shipping.phone.nationalNumber);
            await SMAR7.utils.setInputField('[name="phoneCountry"]', shipping.phone.countryCode);
            await SMAR7.utils.setInputField('[name="address"]', shipping.address1);
            await SMAR7.utils.setInputField('[name="address2"]', shipping.address2);
            await SMAR7.utils.setInputField('[name="zip"]', shipping.zip);
            await SMAR7.utils.setInputField('#city', shipping.city);

            // await SMAR7.utils.setSelectField('[name="country"]', shipping.country_code);
            // await SMAR7.utils.setDropDownField('[name="province"]', shipping.province);
            // await SMAR7.utils.setDropDownField('[name="city"]', shipping.city);

            await SMAR7.utils.setCountry(shipping.country);
            await SMAR7.utils.setProvince(shipping.city, shipping.province);
            await SMAR7.utils.setCity(shipping.city);

            return;
        },

        findRegionAndCity: function (countryData, shipping) {
            var region = countryData.find(function (item) {
                return _.lowerCase(item.n) == _.lowerCase(shipping.province);
            });

            if (region && region.children && region.children.length > 0) {
                var city = region.children.find(function (item) {
                    return _.lowerCase(item.n) == _.lowerCase(shipping.city);
                });

                if (city) {
                    return {'region': region.n, 'city': city.n};
                }
            }

            if (!region) {
                var other = countryData.find(function (e) {
                    return "Other" === e.n;
                });

                if (other !== 'undefined') {
                    shipping.province = 'Other';
                }
            }

            return {'region': shipping.province, 'city': shipping.city};
        }
    },
    utils: {
        /**
         * @param  string type The installType string of the ext chrome object
         * @return string url  The url endpoint for smar7apps server
         */
        domainUrl: function (type) {
            var url = "https://express.smar7apps.com";

            if (type === "development") {
                // url = "https://express.app" // for @rbaklanov
                // url = "https://express.local";
            }

            return url;
        },
        /**
         * @return string  The id of express app inside shopify
         * ie: https://homctest.myshopify.com/admin/apps/smar7-express
         */
        shopifyAppId: function () {
            // Production ID
            var id = 'smar7-express';

            return new Promise(function(resolve) {
                browser.management.getSelf(function (ext) {
                    if (ext.installType === "development") {
                        // Each dev has to change this id according to its environment
                        id = 'express-7'; // huberom
                    }

                    resolve(id);
                });
            });
        },

        // Gets attached stores' domains
        getDomains: function() {
            return new Promise(function (resolve, reject) {
                browser.storage.local.get(["domains"], function(result) {
                    var error = browser.runtime.lastError;
                    if (error) {
                        resolve([]);
                    }

                    if (typeof result.domains !== "undefined") {
                        resolve(result.domains);
                    }

                    resolve([]);
                });
            });
        },

        /**
         * Gets current attached store active domain.
         *
         * @param string  Optional, An specific domain to look for
         * @return string  The id of express app inside shopify
         */
        getStoreDomain: function(store) {
            return new Promise(async (resolve, reject) => {
                var domains = await SMAR7.utils.getDomains();

                if (domains.length <= 0) {
                    resolve(null);
                }

                var found = false, lastDomain = null;
                for (var i = 0; i < domains.length; i++) {
                    if (typeof store != 'undefined') {
                        if (domains[i].name === store) {
                            resolve(domains[i]);
                        }
                    } else {
                        if (domains[i].active) {
                            resolve(domains[i]);
                        }
                    }
                    lastDomain = domains[i];
                }

                if (typeof store != 'undefined') {
                    resolve(null);
                }

                resolve(lastDomain);
            });
        },

        // Attach new store to extension - add store domain to the list
        setStoreDomain: function(domain) {
            return new Promise(async function(resolve) {
                var newDomains = [];
                var domains = await SMAR7.utils.getDomains();

                if (domains.length > 0) {
                    newDomains = domains;
                    var exists = false;
                    for (var i = 0; i < newDomains.length; i++) {
                        if (newDomains[i].name === domain) {
                            exists = true;
                        } else {
                            newDomains[i].active = false;
                        }
                    }

                    if (!exists) {
                        newDomains.push({'name': domain, 'active': true});
                    }
                } else {
                    newDomains.push({'name': domain, 'active': true});
                }

                browser.storage.local.set({domains: newDomains}, () => {
                    console.log('saved', newDomains);
                    resolve(true);
                });
            });
        },

        // Set current active store domain used
        setActiveDomain: function(domain) {
            return new Promise(async (resolve, reject) => {
                var domains = await SMAR7.utils.getDomains();

                if (domains.length <= 0) {
                    resolve(null);
                }

                for (var i = 0; i < domains.length; i++) {
                    domains[i].active = false;
                    if (domains[i].name === domain) {
                        domains[i].active = true;
                        resolve(true);
                    }
                }

                browser.storage.local.set({domains: domains}, () => {
                    console.log('saved', domains);
                    resolve(true);
                });
            });
        },

        /**
         * @param  object cookie  A cookie object
         * @return boolean        Whether or not the cookie is correct
         */
        isValidAeuCid: function (cookie) {
            var parts = cookie.value.split('-');

            if (parts.length < 1) {
                return false;
            }

            return (parts[parts.length - 1] == SMAR7.aeuCid);
        },

        setInputField: function (selector, value) {
            return new Promise(function (resolve, reject) {
                object = this.document.querySelector(selector);
                if (!object) {
                    reject(false);
                }

                document.querySelectorAll(selector).forEach(function (t) {
                    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(t, value);
                    t.dispatchEvent(new Event("change", {
                        bubbles: true
                    }));

                    setTimeout(function () {
                        resolve(true);
                    }, 400);
                });
            });
        },

        setSelectField: function (selector, value) {
            return new Promise(function (resolve, reject) {
                object = this.document.querySelector(selector);
                if (!object) {
                    resolve(false);
                }

                document.querySelectorAll(selector).forEach(function (t) {
                    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(t, value);
                    t.dispatchEvent(new Event("change", {
                        bubbles: true
                    }));

                    setTimeout(function () {
                        resolve(true);
                    }, 1800);
                });
            });
        },

        setDropDownField: function (selector, value) {
            return new Promise(async function (resolve, reject) {
                try {
                    var inputElement = document.querySelector(selector);
                    if (!inputElement) {
                        resolve(false);
                    }

                    var selectElement = inputElement.nextSibling.nextSibling;
                    if (selectElement.type === 'select-one') {
                        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(selectElement, value);
                        selectElement.dispatchEvent(new Event("change", {
                            bubbles: true
                        }));

                        setTimeout(function () {
                            resolve(true);
                        }, 1800);
                    } else {
                        await SMAR7.utils.setInputField(selector, value);
                        resolve(true);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        },

        setCountry: async function (country) {
            return new Promise(async function (resolve, reject) {
                try {
                    // try to find and click country select
                    let countrySelect = $(".country-item");
                    if (!countrySelect.length) {
                        resolve(false);
                    }
                    countrySelect.click();

                    let i = 0;
                    timer = setInterval(function () {
                        // Wait for loading country list
                        const sel = $('.country-item').parents('.zoro-ui-select').find(".country-name");
                        if (sel.length) {
                            sel.each(function (index) {

                                // try to find country in a list and click it
                                if ($(this).text() === country) {
                                    $(this).click();

                                    clearInterval(timer);
                                    resolve(true);
                                } else {
                                    clearInterval(timer);
                                    resolve(false);
                                }
                            });
                        } else {
                            // Too long exit
                            if (i >= 10) {
                                clearInterval(timer);
                                resolve(false);
                            }
                        }

                        i++;
                    }, 500);

                } catch (e) {
                    reject(e);
                }
            });
        },

        setCity: async function (city) {
            return new Promise(async function (resolve, reject) {
                try {
                    let citySelect = $('.addr-select .search-select:nth-of-type(2)').find(".zoro-ui-select");
                    if (!citySelect.length) {
                        resolve(false);
                    }

                    citySelect.click();

                    // let dropdown load
                    let i = 0;
                    timer = setInterval(function () {
                        const sel = $('.next-overlay-wrapper.opened').find(".next-menu-item");
                        if (sel.length) {
                            sel.each(function (index) {
                                if ($(this).text() === city) {
                                    $(this).click();
                                    clearInterval(timer);
                                    resolve(true);
                                } else {
                                    clearInterval(timer);
                                    resolve(false);
                                }
                            });
                        } else {
                            // Too long exit
                            if (i >= 10) {
                                clearInterval(timer);
                                resolve(false);
                            }
                        }
                        i++;
                    }, 500);

                } catch (e) {
                    reject(e);
                }
            });
        },

        setProvince: async function (city, province) {
            return new Promise(async function (resolve, reject) {
                try {
                    let provinceSelect = $('.addr-select .search-select:nth-of-type(1)').find(".zoro-ui-select");
                    if (!provinceSelect.length) {
                        resolve(false);
                    }
                    provinceSelect.click();

                    // let dropdown load
                    let i = 0;
                    timer = setInterval(function () {
                        const sel = $('.next-overlay-wrapper.opened').find(".next-menu-item");
                        if (sel.length) {
                            // first try to find city
                            sel.each(function (index) {
                                if ($(this).text() === city) {
                                    $(this).click();
                                } else {
                                    if ($(this).text() === province) {
                                        $(this).click();
                                        setTimeout(function () {
                                            clearInterval(timer);
                                            resolve(true);
                                        }, 500);
                                    } else {
                                        clearInterval(timer);
                                        resolve(false);
                                    }
                                }
                            });
                        } else {
                            // Too long exit
                            if (i >= 10) {
                                clearInterval(timer);
                                resolve(false);
                            }
                        }
                        i++;
                    }, 500);

                } catch (e) {
                    reject(e);
                }
            });
        },

        phoneCodeByCountry: {
            AD: "+376",
            AE: "+971",
            AF: "",
            AG: "+1 (268)",
            AI: "",
            AL: "+355",
            AM: "+374",
            AN: "",
            AO: "+244",
            AQ: "",
            AR: "+54",
            AS: "",
            ASC: "",
            AT: "+43",
            AU: "+61",
            AW: "+297",
            AX: "",
            AZ: "+994",
            BA: "+387",
            BB: "+1 (246)",
            BD: "+880",
            BE: "+32",
            BF: "+226",
            BG: "+359",
            BH: "+973",
            BI: "+257",
            BJ: "+229",
            BL: "",
            BM: "+1 (441)",
            BN: "+673",
            BO: "+591",
            BQ: "",
            BR: "+55",
            BS: "+1 (242)",
            BT: "+975",
            BV: "",
            BW: "+267",
            BY: "+375",
            BZ: "+501",
            CA: "+1",
            CC: "",
            CD: "+243",
            CF: "+236",
            CG: "+242",
            CH: "+41",
            CI: "+225",
            CK: "",
            CL: "+56",
            CM: "+237",
            CN: "+86",
            CO: "+57",
            CR: "+506",
            CU: "+53",
            CV: "+238",
            CW: "",
            CX: "",
            CY: "+357",
            CZ: "+420",
            DE: "+49",
            DJ: "+253",
            DK: "+45",
            DM: "+1 (767)",
            DO: "+1 (8)",
            DZ: "+213",
            EAZ: "",
            EC: "+593",
            EE: "+372",
            EG: "+20",
            EH: "+212",
            ER: "+291",
            ES: "+34",
            ET: "+251",
            FI: "+358",
            FJ: "+679",
            FK: "+500",
            FM: "+691",
            FO: "+298",
            FR: "+33",
            GA: "+241",
            GB: "+44",
            GBA: "",
            GD: "+1 (473)",
            GE: "+995",
            GF: "+594",
            GG: "+44",
            GGY: "+44",
            GH: "+233",
            GI: "+350",
            GL: "+299",
            GM: "+220",
            GN: "+224",
            GP: "+590",
            GQ: "+240",
            GR: "+30",
            GT: "+502",
            GU: "",
            GW: "+245",
            GY: "+592",
            HM: "",
            HN: "+504",
            HR: "+385",
            HT: "+509",
            HU: "+36",
            ID: "+62",
            IE: "+353",
            IL: "+972",
            IM: "+44",
            IN: "+91",
            IO: "",
            IQ: "+964",
            IR: "+98",
            IS: "+354",
            IT: "+39",
            JE: "+44",
            JEY: "+44",
            JM: "+1 (876)",
            JO: "+962",
            JP: "+81",
            KE: "+254",
            KG: "+996",
            KH: "",
            KI: "+686",
            KM: "+269",
            KN: "+1 (869)",
            KP: "+850",
            KR: "+82",
            KS: "",
            KW: "+965",
            KY: "+1 (345)",
            KZ: "+77",
            LA: "+856",
            LB: "+961",
            LC: "+1 (758)",
            LI: "+423",
            LK: "+94",
            LR: "+231",
            LS: "+266",
            LT: "+370",
            LU: "+352",
            LV: "+371",
            LY: "+218",
            MA: "+212",
            MC: "+377",
            MD: "+373",
            ME: "+382",
            MNE: "+382",
            MF: "",
            MG: "+261",
            MH: "+692",
            MK: "+389",
            ML: "+223",
            MM: "+95",
            MN: "+976",
            MP: "",
            MQ: "+596",
            MR: "+222",
            MS: "",
            MT: "+356",
            MU: "+230",
            MV: "+960",
            MW: "+265",
            MX: "+52",
            MY: "+60",
            MZ: "+258",
            NA: "+264",
            NC: "+687",
            NE: "+227",
            NF: "",
            NG: "+234",
            NI: "+505",
            NL: "+31",
            NO: "+47",
            NP: "+977",
            NR: "+674",
            NU: "",
            NZ: "+64",
            OM: "+968",
            PA: "+507",
            PE: "+51",
            PF: "+689",
            PG: "+675",
            PH: "+63",
            PK: "+92",
            PL: "+48",
            PM: "+508",
            PN: "",
            PR: "+1",
            PS: "",
            PT: "+351",
            PW: "+680",
            PY: "+595",
            QA: "+974",
            RE: "+262",
            RO: "+40",
            RS: "+381",
            SRB: "+381",
            RU: "+7",
            RW: "+250",
            SA: "+966",
            SB: "+677",
            SC: "+248",
            SD: "+249",
            SE: "+46",
            SG: "+65",
            SGS: "",
            SH: "",
            SI: "+386",
            SJ: "+47",
            SK: "+421",
            SL: "+232",
            SM: "+378",
            SN: "+221",
            SO: "+252",
            SR: "+597",
            SS: "+211",
            ST: "+239",
            SV: "+503",
            SX: "+590",
            SY: "+963",
            SZ: "+268",
            TC: "+1 (649)",
            TD: "+235",
            TF: "",
            TG: "+228",
            TH: "+66",
            TJ: "+992",
            TK: "",
            TL: "+670",
            TM: "+993",
            TN: "+216",
            TO: "+676",
            TR: "+90",
            TT: "+1 (868)",
            TV: "+688",
            TZ: "+255",
            UA: "+380",
            UG: "+256",
            UM: "",
            US: "+1",
            UY: "+598",
            UZ: "+998",
            VA: "+39 (066)",
            VC: "+1 (784)",
            VE: "+58",
            VG: "+1 (284)",
            VI: "",
            VN: "+84",
            VU: "+678",
            WF: "+681",
            WS: "+685",
            YE: "+967",
            YT: "+262",
            ZA: "+27",
            ZM: "+260",
            ZW: "+263",
            UK: "+44"
        }
    },
    sentry: {
        // Public Sentry DSN
        dsn: 'https://2a4c4fe085c944ef925bd75cd98a9c9b@sentry.io/158970', // production
        // dsn: 'https://6e46d1c1ffb347d7986e669d09c7c3d6@sentry.io/133376', // test
        install: function () {
            // Raven.config(SMAR7.sentry.dsn).install();
            Sentry.init({dsn: SMAR7.sentry.dsn});
        },
        /**
         * Report error exception to sentry
         * @param  Error  e        Javascript error object
         * @return string          Sentry event report id
         */
        reportError: function (e, tags) {
            var context_info = {};
            if (typeof tags != 'undefined') {
                context_info = tags;
            }

            // Raven.captureException(e, {tags: context_info});
            Sentry.withScope(scope => {
			    scope.setExtra(context_info);
			    Sentry.captureException(e);
			 });

            // return Raven.lastEventId();
            return Sentry.lastEventId();
        }
    }
};
