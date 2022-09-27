/**
 * @typedef {object} XHRCacheOptions
 * @property {"GET"|"POST"} method
 * @property {number} [ttl] - milliseconds
 * @property {boolean} [reload]
 */


/**
 * Cached XHR requests
 * @param {string} url
 * @param {XHRCacheOptions} options - If ttl is present,
 * the request will be cached for that many milliseconds,
 * otherwise it will be cached indefinitely (until cache clear).
 * @return {Promise<string>}
 */
let xhrCache = (url, options) => { // eslint-disable-line no-unused-vars
  return -1;
}; // defined here only to get the JSDoc

(() => {
  const cacheLocation = "xhrCache";
  const cacheMap = new Map();

  xhrCache = function(url, options) {
    const {
      method = "GET",
      ttl = undefined,
      reload = false,
    } = options;

    if (!reload && cacheMap.has(url)) {
      return Promise.resolve(cacheMap.get(url));
    }

    const cache = JSON.parse(localStorage.getItem(cacheLocation) || "{}");
    if (!reload && cache[url]) {
      if (cache[url].ttl && cache[url].ttl < Date.now()) {
        delete cache[url];
        localStorage.setItem(cacheLocation, JSON.stringify(cache));
      } else {
        if (cache[url].ttl == null || cache[url].ttl >= Date.now()) {
          cacheMap.set(url, cache[url].data);
        }
        return Promise.resolve(cache[url].data);
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.onload = () => {
        if (xhr.status === 200) {
          let resp;
          if (xhr.getResponseHeader("Content-Type").includes("application/json") ||
              xhr.getResponseHeader("content-type").includes("application/json")) {
            resp = JSON.parse(xhr.responseText);
          } else {
            resp = xhr.responseText;
          }
          cache[url] = {
            data: resp,
            ttl: ttl ? Date.now() + ttl : null,
          };
          localStorage.setItem(cacheLocation, JSON.stringify(cache));
          if (ttl == undefined || ttl > 1000 * 60 * 60) { // 1 hour
            cacheMap.set(url, resp);
          }
          resolve(resp);
        } else {
          reject(xhr.statusText);
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
    });
  };
})();

