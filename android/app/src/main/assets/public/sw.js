/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  importScripts("/sw-push.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "telebirr-bg.svg",
    "revision": "f132e81be203f0489b2408a7b5b646c9"
  }, {
    "url": "sw-push.js",
    "revision": "a6aee8be5303695768a1ada25bf4e078"
  }, {
    "url": "pwa-screenshot-wide.png",
    "revision": "2b83c1352170118db9f7d0adf60ca952"
  }, {
    "url": "pwa-screenshot-mobile.png",
    "revision": "961a36169513fbbeb5aa1442f4e72af0"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "dc4194268d88896a6353caa40ae2c8b2"
  }, {
    "url": "pwa-512x512.png",
    "revision": "fe2b1b21074d72483da2eddbed5e8752"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1342bcb96eed0c937f3d575bde546d7b"
  }, {
    "url": "index.html",
    "revision": "3450dc188f0315df5675dccfaad3f44c"
  }, {
    "url": "favicon.svg",
    "revision": "6fff91da078ff4540ee449170c156fbd"
  }, {
    "url": "custom-bank-logo.png",
    "revision": "a81248e02d7edad3a4c21fb78c0272ef"
  }, {
    "url": "cbe-gold-logo.png",
    "revision": "a81248e02d7edad3a4c21fb78c0272ef"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1316cb9310bb9e9266b385031a000501"
  }, {
    "url": "icons/icon-maskable.svg",
    "revision": "fb9a93d7632124fed9c820d0157a574c"
  }, {
    "url": "icons/icon-maskable-512.png",
    "revision": "dc4194268d88896a6353caa40ae2c8b2"
  }, {
    "url": "icons/icon-512.svg",
    "revision": "6fff91da078ff4540ee449170c156fbd"
  }, {
    "url": "icons/icon-512.png",
    "revision": "fe2b1b21074d72483da2eddbed5e8752"
  }, {
    "url": "icons/icon-192.svg",
    "revision": "6fff91da078ff4540ee449170c156fbd"
  }, {
    "url": "icons/icon-192.png",
    "revision": "1342bcb96eed0c937f3d575bde546d7b"
  }, {
    "url": "assets/web-CBBQDnO6.js",
    "revision": null
  }, {
    "url": "assets/web-CAdsX5Ep.js",
    "revision": null
  }, {
    "url": "assets/web-BOpjgJzL.js",
    "revision": null
  }, {
    "url": "assets/web-1hSVZSpb.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-JtMm6HcC.js",
    "revision": null
  }, {
    "url": "assets/vendor-canvas-CthjXNGI.js",
    "revision": null
  }, {
    "url": "assets/right_side_sm.png",
    "revision": null
  }, {
    "url": "assets/purify.es-DedTAGkB.js",
    "revision": null
  }, {
    "url": "assets/index.es-CL8_Eu73.js",
    "revision": null
  }, {
    "url": "assets/index-CjUFa3y_.css",
    "revision": null
  }, {
    "url": "assets/index-CdBpR5Wn.js",
    "revision": null
  }, {
    "url": "assets/comp_top_sm.png",
    "revision": null
  }, {
    "url": "assets/comp_mid_sm.png",
    "revision": null
  }, {
    "url": "assets/comp_bot_sm.png",
    "revision": null
  }, {
    "url": "assets/aistudio/transaction-receipt-FT264657XT58__1__104d540b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/screenshot_1793894369095_f458f27f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/screenshot_1792332161141_7b18d68a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/screenshot_1792332138603_2af199ff.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261118-150714_2b807bd7.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261118-150013_f18e1bd5.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261118-150002_638f3bda.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261118-135547_6de6e009.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261118-133302_cb4e6424.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261115-115316_efbf5425.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261115-115141_7cce7bd4.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261112-104837_CBE_FT260636VV89_6a4e303f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261111-125841_a793590d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261111-124236_ce2b6643.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261111-124212_4babee1b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261109-125756_7057493b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261109-124243_5b8f690c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261109-111400_2ca5db0c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-121925_aa56a8f2.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-115946_cf38270c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-114029_367d739a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-114024_60975f65.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261031-141940_c1c9c4a7.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261031-140920_c4c76ce5.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261029-105836_660c9c6e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261028-111001_7018c5b4.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261020-122310_5292bfd0.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261020-121324_338e769c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_20261020_115923_454_648869ff.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1435_78951294.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1434_7887fd88.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1308_f8d80b84.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1245_058ccf64.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1227_1ce0c954.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1218_14863172.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1216_1f2ac2bd.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1211_35ee7fc1.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1207_50b6b4b0.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1205_46b15823.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1149_ca7724f9.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1139_b342d76a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1136_b5bd6afe.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1135_27e3bc18.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1107_d2092b7a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1087_d1c4d08f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_1074_713d7a4b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_0788_81a2184a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_0787_96cceba0.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1316cb9310bb9e9266b385031a000501"
  }, {
    "url": "favicon.svg",
    "revision": "6fff91da078ff4540ee449170c156fbd"
  }, {
    "url": "pwa-192x192.png",
    "revision": "1342bcb96eed0c937f3d575bde546d7b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "fe2b1b21074d72483da2eddbed5e8752"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "dc4194268d88896a6353caa40ae2c8b2"
  }, {
    "url": "pwa-screenshot-mobile.png",
    "revision": "961a36169513fbbeb5aa1442f4e72af0"
  }, {
    "url": "pwa-screenshot-wide.png",
    "revision": "2b83c1352170118db9f7d0adf60ca952"
  }, {
    "url": "sw-push.js",
    "revision": "a6aee8be5303695768a1ada25bf4e078"
  }, {
    "url": "icons/icon-192.png",
    "revision": "1342bcb96eed0c937f3d575bde546d7b"
  }, {
    "url": "icons/icon-512.png",
    "revision": "fe2b1b21074d72483da2eddbed5e8752"
  }, {
    "url": "icons/icon-maskable-512.png",
    "revision": "dc4194268d88896a6353caa40ae2c8b2"
  }, {
    "url": "manifest.webmanifest",
    "revision": "af2fd68afe2862897651c2cacc9021dc"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /^\/downloads\//, /\.apk$/i]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/\/(manifest\.(webmanifest|json)|icons\/.*|pwa-.*|apple-touch-icon.*)/i, new workbox.CacheFirst({
    "cacheName": "cbe-custom-branding-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
