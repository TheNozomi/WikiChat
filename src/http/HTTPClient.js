const axios = require('axios');
const { Cookie, CookieJar } = require('tough-cookie');
const qs = require('qs');

class HTTPClient {
    constructor() {
        this.jar = new CookieJar();
        let cookiejar = this.jar;

        axios.interceptors.request.use(function (config) {
          cookiejar.getCookies(config.url, function(err, cookies) {
            config.headers.cookie = cookies.join('; ');
          });
          return config;
        });

        axios.interceptors.response.use(function (response) {
          if (response.headers['set-cookie'] instanceof Array) {
            let cookies = response.headers['set-cookie'].forEach(function (c) {
              cookiejar.setCookie(Cookie.parse(c), response.config.url, function(err, cookie){});
            });
          }
          return response;
        });
    }

    filter(filter, method, url, options) {
        let promise = method(url, options);
        if (filter) {
            promise = promise.then(res => res.data);
        }
        return promise;
    }

    get(url, options = {}) {
        return this.filter(!options.raw, axios.get, url, {
            ...options
        });
    }

    post(url, options = {}) {
        return this.filter(!options.raw, axios.post, url, {
            ...options
        });
    }

    form(url, options = {}) {
        return this.filter(!options.raw, axios.post, url,
        qs.stringify(options.data), {
            ...options
        });
    }
}

module.exports = HTTPClient;