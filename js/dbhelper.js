/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Opens MWS restaurant IndexedDB.
   * @return {IDBOpenDBRequest} indexedDB request.
   */
  static openDatabase() {
    if (!self.indexedDB) {
      console.log('IndexedDB is not supported');
      return false;
    }

    const DB_VERSION = 1;
    const DB_NAME = 'mws-restaurant';
    let request = self.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.log('Database error: ', event.target.error);
    };

    request.onupgradeneeded = (event) => {
      let db = event.target.result;
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants',
          {keyPath: 'id'}
        );
      }
    };

    return request;
  }

  /**
   * Open IndexedDB Object Store
   * @param {string} storeName
   * @param {function(IDBObjectStore)} successCallback
   * @param {string} transactionMode - default readonly, readwrite for changes.
   * @return {boolean} True if IndexedDB was succesfully opened.
   */
  static openObjectStore(storeName, successCallback, transactionMode) {
    let dbRequest = DBHelper.openDatabase();
    if (!dbRequest) {
      return false;
    }

    dbRequest.onsuccess = (event) => {
      let db = event.target.result;
      let objectStore = db.transaction(storeName, transactionMode)
        .objectStore(storeName);
      successCallback(objectStore);
    };
    return true;
  }

  /**
   * Add object to IndexedDB Object Store
   * @param {string} storeName
   * @param {any} object to store.
   */
  static addToObjectStore(storeName, object) {
    DBHelper.openObjectStore(storeName, (store) => {
      store.add(object);
    }, 'readwrite');
  }

  /**
   * Add restaurant to IndexedDB Object Store
   * @param {*} object
   */
  static addToRestaurantsStore(object) {
    DBHelper.addToObjectStore('restaurants', object);
  }


  /**
   * Clear restaurants of all data.
   */
  static clearAllRestaurants() {
    DBHelper.openObjectStore('restaurants', (store) => {
      store.clear();
    }, 'readwrite');
  }

  /**
   * Get restaurant by identity from IndexedDB Object Store.
   * @param {number} id Restaurant identity.
   * @param {*} successCallback The specified restaurant object.
   */
  static getRestaurantById(id, successCallback) {
    const restaurantId = Number.isInteger(id) ? id : Number.parseInt(id);
    DBHelper.openObjectStore('restaurants', (store) => {
      store.get(restaurantId)
        .onsuccess = (event) => {
          let restaurant = event.target.result;
          successCallback(restaurant);
        };
    });
  }

  /**
   * Gets all restaurants from the IndexedDB Object Store.
   * @param {*} successCallback - Array of resturant objects.
   */
  static getAllRestaurants(successCallback) {
    DBHelper.openObjectStore('restaurants', (store) => {
      store.getAll()
        .onsuccess = (event) => {
          let restaurants = event.target.result;
          successCallback(restaurants);
        };
    });
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }


  /**
   * Fetch restaurants and add data in IndexedDB.
   * @param {function} callback - function to call on error or success.
   */
  static populateRestaurants(callback = undefined) {
    fetch(DBHelper.DATABASE_URL, {'accept': 'application/json; charset=utf-8'})
    .then((res) => res.json()).then((restaurants) => {
        DBHelper.clearAllRestaurants();
        for (let r of restaurants) {
            DBHelper.addToRestaurantsStore(r);
        }
        if (callback) {
          callback(restaurants);
        }
    });
  }

  /**
 * Fetch all restaurants.
 * @param {function} callback - function to call on error or success.
 */
  static fetchRestaurants(callback) {
    DBHelper.getAllRestaurants((restaurants) => {
      if (restaurants.length > 0) {
        callback(null, restaurants);
      } else {
        DBHelper.populateRestaurants((restaurants) => {
          callback(null, restaurants);
        });
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   * @param {number} id
   * @param {function} callback
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.getRestaurantById(id, (restaurantData) => {
      if (restaurantData) {
        callback(null, restaurantData);
      } else {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
          if (error) {
            callback(error, null);
          } else {
            const restaurant = restaurants.find((r) => r.id === id);
            if (restaurant) { // Got the restaurant
              callback(null, restaurant);
            } else { // Restaurant does not exist in the database
              callback('Restaurant does not exist', null);
            }
          }
        });
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   * @param {string} cuisine
   * @param {function} callback
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter((r) => r.cuisine_type === cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   * @param {string} neighborhood
   * @param {function} callback
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants
                          .filter((r) => r.neighborhood === neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood
   * with proper error handling.
   * @param {string} cuisine
   * @param {string} neighborhood
   * @param {function} callback
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter((r) => r.cuisine_type === cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter((r) => r.neighborhood === neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   * @param {function} callback
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   * @param {function} callback
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   * @param {object} restaurant
   * @return {string} Restaurant details URL
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   * @param {object} restaurant
   * @return {string} Photo URL.
   */
  static imageUrlForRestaurant(restaurant) {
    // Fallback photograph if missing restaurant photo
    if (!restaurant.photograph) {
      return '/img/10.jpg';
    }
    let photograph = restaurant.photograph.endsWith('.jpg') ?
      restaurant.photograph : `${restaurant.photograph}.jpg`;
    return `/img/${photograph}`;
  }

  /**
   * Map marker for a restaurant.
   * @param {object} restaurant
   * @param {object} map
   * @return {google.maps.Marker} Marker
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP,
    }
    );
    return marker;
  }
}
