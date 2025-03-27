
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

// 6) Change some styling in the main.css file and make sure that the new file gets loaded + cached (hint: versioning)
var CACHE_STATIC_NAME = 'static-v23';
// 8) Add dynamic caching (with versioning) to cache everything in your app when visited/ fetched by the user
var CACHE_DYNAMIC_NAME = 'dynamic-v2';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.purple-red.min.css'
];

self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing Service Worker ...', event);
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
          .then(function(cache) {
            console.log('[Service Worker] Precaching App Shell');
            // 2) Identify the AppShell (i.e. core assets your app requires to provide its basic "frame")
// 3) Precache the AppShell
            cache.addAll(STATIC_FILES);
      
          })
      )    
});


self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating Service Worker ...', event);
    // 7) Make sure to clean up unused caches
    event.waitUntil(
      caches.keys()
        .then(function(keyList) {
          //map is used to convert into an array of promises
          return Promise.all(keyList.map(function(key) {
            if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME ) {
              console.log('[Service Worker] Removing old cache.', key);
              return caches.delete(key);
            }
          }));
        })
    );
  
    return self.clients.claim();
});

//Add the below function which specify the name of the cache you want to trim 
//the maximum number of items that can stay in the cache
// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName)
//     .then(function (cache) {
//       return cache.keys()
//         .then(function (keys) {
//           if (keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems));
//           }
//         });
//     })
// }


//the use of this function is to check when the first element of the array
//  (see static array above is ‘/’ then return true otherwise false)
function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log('matched ', string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

//cache then network strategy + offline support + routing + fetch some assets always from cache (elseif part)
self.addEventListener('fetch', function (event) {
  var url = 'https://dbpwa-75318-default-rtdb.firebaseio.com/posts';
//so here once this url is recognized, it is saved in our dynamic cache
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(fetch(event.request)
    .then(function (res) {
      var clonedRes = res.clone();
      //to prevent deleted data staying in our indexeddb
      clearAllData('posts')
          .then(function () {
            //return data in json format
            return clonedRes.json();
          })
          .then(function (data) {
            for (var key in data) {
                  //invoke the writeData function from utility.js and pass the posts object store to it
    //to write data to it in indexeddb
    writeData('posts', data[key])
            }
          });
        return res; 
        })
      );
//ensure that all static file assets are loaded only from the cache
//do not return true always if it find ‘/’ from the above array
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(
      caches.match(event.request)
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(function (response) {
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then(function (res) {
                return caches.open(CACHE_DYNAMIC_NAME)
                  .then(function (cache) {
                    //trimCache(CACHE_DYNAMIC_NAME, 3);
                    cache.put(event.request.url, res.clone());
                    return res;
                  })
              })
              .catch(function (err) {
                return caches.open(CACHE_STATIC_NAME)
                  .then(function (cache) {
                    if (event.request.headers.get('accept').includes('text/html')) {
                    return cache.match('/offline.html');
                    }
                  });
              });
          }
        })
    );
  }
});

//caching then network strategy + dynamic caching 
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.open(CACHE_DYNAMIC_NAME)
//       .then(function(cache) {
//         return fetch(event.request)
//           .then(function(res) {
//             cache.put(event.request, res.clone());
//             return res;
//           });
//       })
//   );
// });

// 4) Add Code to fetch the precached assets from cache when needed
//cache then network strategy code
// self.addEventListener('fetch', function(event) {
//     event.respondWith(
//         caches.match(event.request)
//           .then(function(response) {
//             if (response) {
//               return response;
//             } else {
//               return fetch(event.request)
//               .then(function(res) {
//                 return caches.open(CACHE_DYNAMIC_NAME)
//                   .then(function(cache) {
//                                         //put a resource retrieve from network into cache and giving it a key name which is the url request and value that 
//                     //is the response we getting back
//                     //use clone to use the response here in the cache and still return the response to the user otherwise he will never get the response
//                     cache.put(event.request.url, res.clone());
//                     return res;
//                   })
//               })
//               .catch(function(err){
//                 return caches.open(CACHE_STATIC_NAME)
//                 .then(function(cache) {
//                   return cache.match('/offline.html');
//                 });

//               });
//             }
//           })
//       );
    
// });

//network strategy then dynamic caching + cache fallback
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function(res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//       })
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });


// Cache-only
/*
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
  );
});
*/

// Network-only
/*
self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request)
  );
});
*/
