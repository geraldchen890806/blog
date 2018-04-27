const cache = {};


export function getCache(url, ajaxConfig) {
  return new Promise((resolve, reject) => {
    if (cache[url]) {
      resolve(cache[url]);
    } else {
      $.ajax({
        type: 'GET',
        url: `${_config.api}/${url}`,
        success: (resp) => {
          cache[url] = resp;
          resolve(resp);
        },
        fail: (resp) => {
          reject(resp);
        },
        ...ajaxConfig,
      });
    }
  });
}

export function refreshCache(url, ajaxConfig) {
  return new Promise((resolve, reject) => {
    $.ajax({
      type: 'GET',
      url: `${_config.api}/${url}`,
      success: (resp) => {
        cache[url] = resp;
        resolve(resp);
      },
      fail: (resp) => {
        reject(resp);
      },
      ...ajaxConfig,
    });
  });
}

export function clearCache(url) {
  cache[url] = null;
}
