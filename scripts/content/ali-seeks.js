var ALISEEKS = function(key) {
  this.key = key;
  this.status = null;
  this.response = null;
  this.responseCallback = null;
  this.formData = null;
  this.data = {};

  /**
   * Build Request
   *
   * Create a new XMLHttpRequest.
   */
  this.buildRequest = function(method, endpoint) {
    var request = new XMLHttpRequest();
    var thiz = this;

    request.onreadystatechange = function() {
      thiz.status = request.status;

      if (request.readyState === XMLHttpRequest.DONE) {
        if(request.responseText) {
          thiz.setResponse(JSON.parse(request.responseText));
          thiz.responseCallback(thiz);
        }
      }
    }

    request.open(method, endpoint);
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('X-Api-Client-Id', this.key);

    return request;
  }

  this.getProduct = function(id) {
    var request = this.buildRequest('POST', 'https://api.aliseeks.com/v1/products/details');

    request.send(JSON.stringify({
      'productId': id
    }));

    return this;
  }

  this.getShipping = function(id) {
    var request = this.buildRequest('POST', 'https://api.aliseeks.com/v1/products/shipping');

    request.send(JSON.stringify({
      'productId': id
    }));

    return this;
  }

  /**
   * Get Variations
   */
  this.getVariations = function(id) {
    var request = this.buildRequest('POST', 'https://api.aliseeks.com/v1/products/variations');

    request.send(JSON.stringify({
      'productId': id
    }));

    return this;
  }

  /**
   * Get Range
   */
  this.getRange = function(min, max) {
    return min || max ? {'from': min, 'to': max} : {};
  }

  /**
   * Search
   * @link https://docs.aliseeks.com/api/#search-products
   */
  this.search = function() {
    var request = this.buildRequest('POST', 'https://api.aliseeks.com/v1/search');

    this.setData();

    request.send(this.formData);

    return this;
  }

  /**
   * Set Currency
   */
  this.setCurrency = function(currency) {
    this.data.currency = currency;
    return this;
  }

  this.setFreightType = function(type) {
    this.data.freightTypes = type;
    return this;
  }

  /**
   * Set Form Data
   */
  this.setData = function() {
    this.formData = JSON.stringify(this.data);
    return this;
  }

  /**
   * Set Request Headers
   */
  this.setHeaders = function() {
    this.request.setRequestHeader('Content-Type', 'application/json');
    this.request.setRequestHeader('X-Api-Client-Id', this.key);
  }

  /**
   * Set Limit
   */
  this.setLimit = function(limit) {
    this.data.limit = limit;
    return this;
  }

  /**
   * Set Order Range
   */
  this.setOrderRange = function(min) {
    if(min) {
      this.data.orderRange = {
        'from': min
      };
    }
    return this;
  }

  /**
   * Set Price Range
   */
  this.setPriceRange = function(min, max) {
    this.data.priceRange = this.getRange(min, max);

    return this;
  }

  /**
   * Set Quantity Range
   */
  this.setQuantityRange = function(min, max) {
    this.data.quantityRange = this.getRange(min, max);

    return this;
  }

  /**
   * Set Ratings Range
   */
  this.setRatingsRange = function(min, max) {
    this.data.ratingsRange = this.getRange(min, max);

    return this;
  }

  /**
   * Set Response
   */
  this.setResponse = function(response) {
    this.response = response;
  }

  /**
   * Set Skip
   */
  this.setSkip = function(skip) {
    this.data.skip = skip;
    return this;
  }

  /**
   * Set Sort
   */
  this.setSort = function(sort) {
    this.data.sort = sort;
    return this;
  }

  /**
   * Set Text
   */
  this.setText = function(value) {
    this.data.text = value;
    return this;
  }

  /**
   * Then
   *
   * Set callback to run once the response
   * has returned.
   */
  this.then = function(callback) {
    this.responseCallback = callback;
  }

  return this;
}