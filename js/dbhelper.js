/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Opens MWS restaurant IndexedDB.
   * @return {Promise<IDBDatabase>} indexedDB request.
   */
  static openDatabase() {
    return new Promise((resolve, reject) => {
      if (!self.indexedDB) {
        reject('IndexedDB is not supported');
      }
      const DB_VERSION = 3;
      const DB_NAME = 'mws-restaurant';
      let request = self.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        reject('Database error: ', event.target.error);
      };

      request.onupgradeneeded = (event) => {
        let db = event.target.result;
        if (!db.objectStoreNames.contains('restaurants')) {
          db.createObjectStore('restaurants',
            {keyPath: 'id'}
          );
        }
        if (!db.objectStoreNames.contains('dispatch-queue')) {
          db.createObjectStore('dispatch-queue',
            {autoIncrement: true}
          );
        }
        if (!db.objectStoreNames.contains('reviews')) {
          db.createObjectStore('reviews',
            {keyPath: 'id'}
          );
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }

  /**
   * Open IndexedDB Object Store
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @param {IDBTransactionMode} transactionMode
   * @return {IDBObjectStore} store
   */
  static openObjectStore(db, storeName, transactionMode) {
    return db
      .transaction(storeName, transactionMode)
      .objectStore(storeName);
  };

  /**
   * Add object to IndexedDB Object Store
   * @param {string} storeName
   * @param {object} object
   * @return {Promise}
   */
  static addToObjectStore(storeName, object) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        DBHelper.openObjectStore(db, storeName, 'readwrite')
          .add(object).onsuccess = resolve;
      }).catch((errorMessage) => {
        reject(errorMessage);
      });
    });
  };

  /**
   * Update object in IndexedBD Object Store
   * @param {string} storeName
   * @param {Number} id
   * @param {object} object
   * @return {Promise}
   */
  static updateInObjectStore(storeName, id, object) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        DBHelper.openObjectStore(db, storeName, 'readwrite')
          .openCursor().onsuccess = (event) => {
            let cursor = event.target.result;
            if (!cursor) {
              reject('Restaurant not found in object store');
            }
            if (cursor.value.id === id) {
              cursor.update(object).onsuccess = resolve;
              return;
            }
            cursor.continue();
          };
      }).catch((errorMessage) => {
        reject(errorMessage);
      });
    });
  };

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
    DBHelper.openDatabase().then((db) => {
      DBHelper.openObjectStore(db, 'restaurants', 'readwrite').clear();
    });
  }

  /**
   * Get restaurant by identity from IndexedDB Object Store.
   * @param {number} id Restaurant identity.
   * @return {Promise} The specified restaurant object.
   */
  static getRestaurantById(id) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        const restaurantId = Number.isInteger(id) ? id : Number.parseInt(id);
        DBHelper.openObjectStore(db, 'restaurants')
          .get(restaurantId)
          .onsuccess = (event) => {
            let restaurant = event.target.result;
            resolve(restaurant);
          };
      });
    });
  }

  /**
   * Gets all restaurants from the IndexedDB Object Store.
   * @return {Promise<Array>} Restaurants
   */
  static getAllRestaurants() {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        const request = DBHelper.openObjectStore(db, 'restaurants').getAll();
        request.onsuccess = (event) => {
          let restaurants = event.target.result;
          resolve(restaurants);
        };
        request.onerror = reject;
      });
    });
  }


  /**
   * Gets all restaurants that matches provided predicate.
   * @param {*} predicat Restaurant boolean expression
   * @return {Promise<Array>} Restaurants
   */
  static getAllRestaurantsLike(predicat) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        let restaurants = [];
        let request = DBHelper.openObjectStore(db, 'restaurants').openCursor();
        request.onsuccess = (event) => {
          let cursor = event.target.result;
          if (cursor) {
            if (predicat(cursor.value)) {
              restaurants.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(restaurants);
          }
        };
        request.onerror = (event) => reject(event);
      });
    });
  }


  /**
   * Delete command from dispatch queue IndexedDB store.
   * @param {numeric} queueId
   * @return {Promise}
   */
  static deleteFromQueue(queueId) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        const store = DBHelper.openObjectStore(db, 'dispatch-queue', 'readwrite');
        store.delete(queueId);
        store.onerror = (error) => reject(error);
        store.onsuccess = () => resolve();
      });
    });
  }


  /** 
   * Add review
   * @param {object} review
   */
  static addToReviewsStore(review) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        const store = DBHelper.openObjectStore(db, 'reviews', 'readwrite');
        store.onerror = (error) => reject(error);
        store.onsuccess = () => resolve();
        store.add(review);
      });
    });
  }

  /**
   * 
   * @param {number} restaurantId 
   */
  static getAllRestaurantReviews(restaurantId) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then((db) => {
        let reviews = [];
        let request = DBHelper.openObjectStore(db, 'reviews').openCursor();
        request.onsuccess = (event) => {
          let cursor = event.target.result;
          if (cursor) {
            if (cursor.value.restaurant_id === restaurantId) {
              reviews.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(reviews);
          }
        };
        request.onerror = (event) => reject(event);
      });
    });
  }

  /**
   * Database restaurants URL.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Database reviews URL
   */
  static get DATABASE_REVIEWS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Fetch restaurants and add data in IndexedDB.
   * @return {Promise<Array>} Restaurants
   */
  static populateRestaurants() {
    return fetch(DBHelper.DATABASE_URL,
      {headers: new Headers({'accept': 'application/json; charset=utf-8'})})
      .then((res) => res.json()).then((restaurants) => {
        DBHelper.clearAllRestaurants();
        for (let r of restaurants) {
          DBHelper.addToRestaurantsStore(r);
        }
        return restaurants;
      });
  }

  /**
 * Fetch all restaurants.
 * @return {Promise<Array>} Restaurants
 */
  static fetchRestaurants() {
    return DBHelper.getAllRestaurants().then((restaurants) => {
      if (restaurants.length > 0) {
        return restaurants;
      } else {
        return DBHelper.populateRestaurants();
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   * @param {number} id
   * @return {Promise} Restaurant
   */
  static fetchRestaurantById(id) {
    return new Promise((resolve, reject) => {
      const restaurantId = Number.isInteger(id) ? id : Number.parseInt(id);
      DBHelper.getRestaurantById(restaurantId).then((restaurant) => {
        if (restaurant) {
          resolve(restaurant);
        } else {
          DBHelper.fetchRestaurants().then((restaurants) => {
            const restaurant = restaurants.find((r) => r.id === restaurantId);
            if (restaurant) { // Got the restaurant
              resolve(restaurant);
            } else { // Restaurant does not exist in the database
              reject(`Restaurant does not exist. id: ${id}`);
            }
          });
        }
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood
   * with proper error handling.
   * @param {string} cuisine
   * @param {string} neighborhood
   * @return {Promise<Array>} Restaurants
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    return DBHelper.fetchRestaurants().then((restaurants) => {
      const filterCuisine = cuisine !== 'all';
      const cuisinePredicat = (r) => r.cuisine_type === cuisine;
      const filterNeighborhood = neighborhood !== 'all';
      const neighborhoodPredicat = (r) => r.neighborhood === neighborhood;

      return DBHelper.getAllRestaurantsLike((r) => {
        if (filterCuisine && filterNeighborhood) {
          return cuisinePredicat(r) && neighborhoodPredicat(r);
        } else if (filterCuisine) {
          return cuisinePredicat(r);
        } else if (filterNeighborhood) {
          return neighborhoodPredicat(r);
        } else {
          return (r) => true;
        }
      }).then((restaurants) => {
        return restaurants;
      });
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   * @return {Promise<string[]>} Unique neighborhoods
   */
  static fetchNeighborhoods() {
    return DBHelper.fetchRestaurants().then((restaurants) => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
      // resolve(uniqueNeighborhoods);
      return uniqueNeighborhoods;
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   * @return {Promise<string[]>} Unique cuisines
   */
  static fetchCuisines() {
    return new Promise((resolve, reject) => {
      DBHelper.fetchRestaurants().then((restaurants) => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
        resolve(uniqueCuisines);
      });
    });
  }

  /**
   * Restaurant page URL.
   * @param {number} id Restaurant identity
   * @return {string} Restaurant details URL
   */
  static urlForRestaurant({id}) {
    return (`./restaurant.html?id=${id}`);
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
   * URL for making restaurant favorite, through PUT request.
   * @param {number} id Restaurant identity
   * @param {boolean} is_favorite True for favorite restaurant
   * @return {string} Restaurant favorite URL.
   */
  static urlToogleRestaurantFavorite({id, is_favorite}) {
    const baseUrl = this.DATABASE_URL;
    if (is_favorite === undefined || is_favorite === false || is_favorite === 'false') {
      return `${baseUrl}/${id}/?is_favorite=true`;
    }
    return `${baseUrl}/${id}/?is_favorite=false`;
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

  /**
   * Favorite or un-favorite a restaurant
   * @param {string} url with restaurant_id and is_favorite boolean value.
   * @return {Promise<Response>}
   */
  static toggleFavorite(url) {
    return fetch(url, {
        method: 'PUT',
        headers: new Headers({'content-type': 'application/json; charset=utf-8'}),
    });
  }

  /**
   * Add reviews list to IndexedDB reviews store.
   * @param {Array} reviews 
   */
  static populateReviews(reviews) {
    reviews.forEach((review) => {
      DBHelper.addToReviewsStore(review);
    });
  }

  /**
   * Fetch restaurants reviews with fallback on IndexedDB when offline
   * @param {object} restaurant
   * @return {Promise<Array>} List of reviews 
   */
  static fetchRestaurantReviews(restaurant) {
    return fetch(`${DBHelper.DATABASE_REVIEWS_URL}/?restaurant_id=${restaurant.id}`,
    {headers: new Headers({'accept': 'application/json; charset=utf-8'})}).then((res) => res.json())
    .then((reviews) => {
      DBHelper.populateReviews(reviews);
      return reviews;
    }).catch((e) => {
      return DBHelper.getAllRestaurantReviews(restaurant.id).catch(() => []);
    });
  }

  /**
   * @param {object} review
   * @return {Promise<object>} Review object created
   */
  static postRestaurantReview(review) {
    return fetch(DBHelper.DATABASE_REVIEWS_URL, {
      'method': 'POST',
      'mode': 'cors',
      'Content-Type':
      'application/json; charset=utf-8',
      'body': JSON.stringify(review)})
    .then((res) => res.json())
    .catch((e) => console.log('postRestaurantReview error', e));
  }
}
