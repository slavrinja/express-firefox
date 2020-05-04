$(function () {
    // utils.clearStorage();

    $('#domain-list').change(function(e) {
        var optionSelected = $("option:selected", this);
        SMAR7.utils.setActiveDomain(this.value);
    });
});

SMAR7.utils.getDomains().then(function(domains) {
    if (domains.length > 0) {
        $('#current-domain').val(domains[0].name).hide();
        var $dropDown = $('#domain-list');
        $dropDown.empty();

        var dropDown = document.getElementById("domain-list");

        for (var i = 0; i < domains.length; i++) {
            // selected="selected"
            //$dropDown.append('<option  value="whatever">text</option>')
            var option = document.createElement("option");
            //option.setAttribute('innerHTML', domains[i].name);
            option.setAttribute('value', domains[i].name);
            option.innerHTML = domains[i].name;
            if (domains[i].active) {
                option.setAttribute('selected', "selected");
            }
            dropDown.appendChild(option);
        }

        $('.stores-links').hide();
        $('.ext-connected').show();
    } else {
        $('.ext-not-connected').show();
        $('.ext-connected').hide();
        $('.stores-links-container').hide();

        browser.tabs.query({'url': "*://*.myshopify.com/*"}, async function (tabs) {
            var stores = [];
            var appID = await SMAR7.utils.shopifyAppId();

            if (typeof tabs != 'undefined') {
                for (var i = 0; i < tabs.length; i++) {
                    urlObject = new URL(tabs[i].url);
                    var url = urlObject.protocol + '//' + urlObject.hostname + '/admin/apps/' + appID;
                    stores.push({
                        'hostname' : urlObject.hostname,
                        'url' : url
                    });
                }
                // Filter duplicated stores. When same store opened in multiple tabs
                stores = utils.getUnique(stores, 'hostname');
            }

            if (stores.length > 0) {
                for (var i = 0; i < stores.length; i++) {
                    var anchor = document.createElement('a');
                    anchor.setAttribute('href', stores[i].url);
                    anchor.setAttribute('target', '_blank');
                    anchor.innerHTML = stores[i].hostname;
                    $(".stores-links").append(anchor);
                }

                $('.stores-links-container').show();
            }
        });
    }
});

var utils = {
    clearStorage: function() {
        browser.storage.local.clear(function() {
            var error = browser.runtime.lastError;
            if (error) {
                console.error(error);
            }
        });
    },
    getUnique: function (arr, comp) {
      const unique = arr
           .map(e => e[comp])

         // store the keys of the unique objects
        .map((e, i, final) => final.indexOf(e) === i && i)

        // eliminate the dead keys & store unique objects
        .filter(e => arr[e]).map(e => arr[e]);

       return unique;
    }

};
