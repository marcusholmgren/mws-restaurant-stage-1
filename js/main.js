// globals restaurants, neighborhoods, cuisines & map;
self.markers = [];
const BlackStar = '&#9733;';

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();
  updateRestaurants();
  scrollMaincontentIntoViewOnSkipContent();
});

registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('serviceworker.js').then(() => {
    }).catch((error) => {
      console.log('Failed to register serviceWorker.', error);
    });
  }
};

scrollMaincontentIntoViewOnSkipContent = () => {
  document.querySelector('#skiptocontent > a').addEventListener(
    'click', (event) => {
      setTimeout(() => {
        document.getElementById('maincontent').scrollIntoView();
      }, 10);
  });
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods().then((neighborhoods) => {
    self.neighborhoods = neighborhoods;
    fillNeighborhoodsHTML();
  }).catch((event) => {
    console.error('fetchNeighborhoods', event.message);
  });
};

/**
 * Set neighborhoods HTML.
 * @param {object[]} neighborhoods
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  if (select) {
    neighborhoods.forEach((neighborhood) => {
      const option = document.createElement('option');
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
  }
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines().then((cuisines) => {
    self.cuisines = cuisines;
    fillCuisinesHTML();
  }).catch((error) => {
    console.error('fetchCuisines', error);
  });
};

/**
 * Set cuisines HTML.
 * @param {object} cuisines
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  if (select) {
    cuisines.forEach((cuisine) => {
      const option = document.createElement('option');
      option.innerHTML = cuisine;
      option.value = cuisine;
      select.append(option);
    });
  }
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501,
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false,
  });
  if (self.restaurants) {
    fillRestaurantsHTML();
  }
  google.maps.event.addDomListener(window, 'load', () => {
      const mapsTarget = document.querySelector('iframe');
      if (mapsTarget) {
        mapsTarget.title = 'Google Maps';
      }
  });
};


/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  if (!cSelect) {
    return;
  }
  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood).then((restaurants) => {
    if (!restaurants) {
      console.log('fetchRestaurantByCuisineAndNeighborhood no restaurants');
      return;
    }
    resetRestaurants(restaurants);
    fillRestaurantsHTML(restaurants);
  }).catch((event) => {
    console.error('updateRestaurants', event.message);
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 * @param {object[]} restaurants
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach((m) => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 * @param {object[]} restaurants
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach((restaurant) => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 * @param {object} restaurant
 * @return {HTMLLIElement} list item
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Restaurant ${restaurant.name} in ${restaurant.neighborhood}`;
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  const favorite = document.createElement('button');
  favorite.className = getFavoriteStarStyle(restaurant.is_favorite);
  console.log(`Star style: ${restaurant.id} is_favorite? ${restaurant.is_favorite} (${typeof(restaurant.is_favorite)}), class: ${favorite.className}`);
  favorite.innerHTML = BlackStar;
  favorite.dataset['restaurantId'] = restaurant.id;
  favorite.dataset['url'] = DBHelper.urlToogleRestaurantFavorite(restaurant);
  li.append(favorite);
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration.sync.register('toggle-favorite');
      favorite.addEventListener('click', favoriteRestaurantSyncHandler);
    });
  } else {
    console.log('register click event for non SyncManager');
    favorite.addEventListener('click', favoriteRestaurantDirectHandler);
  }

  return li;
};


/**
 * Get CSS style for favorite restaurant marker.
 * @param {boolean} isFavorite True if restaurant is favorite
 * @return {string} CSS Style
 */
getFavoriteStarStyle = (isFavorite) => {
  if (isFavorite === true || isFavorite === 'true') {
    return 'rating-star-favorite';
  }
  return 'rating-star';
};

isRestaurantFavorite = (restaurant) => (restaurant.is_favorite === true || restaurant.is_favorite === 'true');


/**
 * Update IndexedDB restaurant object and HTML button control.
 * @param {HTMLButtonElement} favorite
 * @return {Promise}
 */
updateRestaurantAndButton = (favorite) => {
  return new Promise((resolve, reject) => {
    const restaurant_id = Number.parseInt(favorite.getAttribute('data-restaurant-id'));
    DBHelper.getRestaurantById(restaurant_id).then((restaurant) => {
      const is_favorite = !isRestaurantFavorite(restaurant);
      const updatedRestaurant = {...restaurant, is_favorite};
      DBHelper.updateInObjectStore('restaurants', restaurant.id, updatedRestaurant);
  
      const url = DBHelper.urlToogleRestaurantFavorite({id: restaurant.id, is_favorite: !is_favorite});
      favorite.dataset['url'] = url;
      favorite.innerHTML = BlackStar;
      favorite.className = getFavoriteStarStyle(is_favorite);
  
      resolve({restaurant_id, url});
    });
  });
}

/**
 * Button click handler for browsers that don't yet support SyncManager
 * @param {MouseEvent} event
 */
favoriteRestaurantDirectHandler = (event) => {
  event.preventDefault();
  const favorite = event.target;
  updateRestaurantAndButton(favorite).then(({restaurant_id, url}) => {
    DBHelper.toggleFavorite(url);
  });
};

/**
 * Button click handler for browsers that support SyncManager.
 * @param {MouseEvent} event
 */
favoriteRestaurantSyncHandler = (event) => {
  event.preventDefault();
  const favorite = event.target;
  updateRestaurantAndButton(favorite).then(({restaurant_id, url}) => {
    DBHelper.addToObjectStore('dispatch-queue',
      {action: 'toggle-favorite', url, restaurant_id});
  });
};

/**
 * Add markers for current restaurants to the map.
 * @param {object[]} restaurants
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach((restaurant) => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
