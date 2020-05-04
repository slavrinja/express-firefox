/**
 * Shipping
 */
class ShippingInfo {
  /**
   * Constructor
   *
   * @param object product
   * @param object aliseeks
   */
  constructor(product, aliseeks) {
    this.product = product;
    this.aliseeks = aliseeks;
  }

  /**
   * Get Services
   *
   * Returns all available shipping methods for a product.
   *
   * @param  int     productId
   * @param  closure callback
   *
   * @return void
   */
  getServices(productId, callback) {
    this.aliseeks.getShipping(productId).then(() => {
      this.data = this.aliseeks.response;

      callback ? callback.call() : '';
    });
  }

  /**
   * ePacket Available
   *
   * @return boolean
   */
  ePacketAvailable() {
    let result = false;

    this.data.options.forEach((option) => {
      if(option.company === 'ePacket') {
        result = true;
      }
    });

    return result;
  }

  /**
   * Get Product ID
   *
   * @return int|null
   */
  getProductId() {
      const ids = this.product.regExSource.match(this.product.productIdRegEx);

      return ids[0] || null;
  }

  /**
   * Get Notice Element
   *
   * @return HTML Node
   */
  getNoticeElement() {
    const notice = document.createElement('span');
          notice.classList.add('epacket-notice');

    if(this.ePacketAvailable()) {
      notice.classList.add('available');
      notice.innerHTML = '<i class="s7-icon icon-tick"></i> ePacket Delivery';
    } else {
      notice.classList.add('unavailable');
      notice.innerHTML = '<i class="s7-icon icon-close"></i> Not ePacket';
    }

    return notice;
  }

  /**
   * Insert Notice
   *
   * @return void
   */
  insertNotice() {
    this.product.shippingContainer.appendChild(this.getNoticeElement());
  }
}

/**
 * New UI Product
 */
class NewUiProduct {
  // RegEx to find the product's ID
  productIdRegEx = /(?<=\"productId\"\:)\d+/;
  // Where to search for ID
  regExSource = document.documentElement.innerHTML;
  // Where to insert ePacket notice
  shippingContainer = document.querySelector('.product-shipping-date') || document.querySelector('.product-shipping');
}

/**
 * Old UI Product
 */
class OldUiProduct {
  // RegEx to find the product's ID
  productIdRegEx = /(?<=window\.runParams\.productId\=\")\d+/;
  // Where to search for ID
  regExSource = document.documentElement.innerHTML;
  // Where to insert ePacket notice
  shippingContainer = document.querySelector('.p-logistics-addition-info');
}

/**
 * Search Product
 *
 * Individual products on search results and category pages.
 */
class SearchProduct {
  // RegEx to find the product's ID
  productIdRegEx = /(?<=data-product-id\=\")\d+/;
  // Where to search for ID
  regExSource = null;
  // Where to insert ePacket notice
  shippingContainer = null;
}

/**
 * Page Info
 */
class PageInfo {
  /**
   * Is Listing
   *
   * Determines if the user on a listings page (search/category).
   *
   * @return boolean
   */
  isListing() {
    const ids = ['we-wholesale-search-list', 'we-wholesale-category-list'];
    return ids.some(id => document.body.id === id);
  }

  /**
   * Is Gallery View
   *
   * If on a listing page, are products displayed
   * in the gallery format.
   *
   * @return boolean
   */
  isGalleryView() {
    return document.querySelectorAll('.list-item .item').length > 0;
  }

  /**
   * Is Product
   *
   * Determines if the user on a product page.
   *
   * @return boolean
   */
  isProduct() {
    return this.isNewUi() || this.isOldUi();
  }

  /**
   * Is New UI
   *
   * If on product page, is the the "new" UI
   *
   * @return boolean
   */
  isNewUi() {
    return document.querySelector('.product-action');
  }

  /**
   * Is Old UI
   *
   * If on product page, is the the "old" UI
   *
   * @return boolean
   */
  isOldUi() {
    return document.querySelector('.product-action-main');
  }
}

// Page Helper
const Page = new PageInfo;

if(Page.isListing()) {
  // Grab products depending on current view
  const products = Page.isGalleryView() ? document.querySelectorAll('.list-item .item')
                                        : document.querySelectorAll('li.list-item');

  // Loop through each product
  products.forEach(function(product) {
     searchProduct = new SearchProduct;
     searchProduct.regExSource = product.innerHTML;
     searchProduct.shippingContainer = product.querySelector('.free-s') || product.querySelector('.pnl-shipping');

     const SearchShipping = new ShippingInfo(searchProduct, new ALISEEKS('GTQDNZDNVXIDOEER'));
     const id = SearchShipping.getProductId();

     SearchShipping.getServices(id, () => SearchShipping.insertNotice());
  });

} else if(Page.isProduct()) {
  const product = Page.isNewUi() ? new NewUiProduct : new OldUiProduct;
  const ProductShipping = new ShippingInfo(product, new ALISEEKS('GTQDNZDNVXIDOEER'));
  const id = ProductShipping.getProductId();

  ProductShipping.getServices(id, () => ProductShipping.insertNotice());
}
