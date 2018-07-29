// globals restaurant & map;


document.addEventListener('DOMContentLoaded', (event) => {
  fetchRestaurantFromURL().then((restaurant) => {
    fillRestaurantHTML(restaurant);
    fetchRestaurantReviews(restaurant);
    return restaurant;
  })
  .then((restaurant) => {
    fillBreadcrumb(restaurant);
    addNewReviewsButton(restaurant);
  });
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL().then((restaurant) => {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: restaurant.latlng,
      scrollwheel: false,
    });
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  }).catch((error) => {
    console.error('Failed to get restaurant map:', error);
  });

  google.maps.event.addDomListener(window, 'load', () => {
    const mapsTarget = document.querySelector('iframe');
    if (mapsTarget) {
      mapsTarget.title = 'Google Maps';
    }
  });
};

/**
 * Get current restaurant from page URL.
 * @return {Promise} Restaurant
 */
fetchRestaurantFromURL = () => {
  return new Promise((resolve, reject) => {
    if (self.restaurant) { // restaurant already fetched!
      resolve(self.restaurant);
      return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      reject('No restaurant id in URL');
    } else {
      DBHelper.fetchRestaurantById(id).then((restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          reject('No restaurant id in URL');
          return;
        }
        resolve(restaurant);
      });
    }
  });
};


/**
 * Get reviews for restaurant and add it them to the webpage.
 */
fetchRestaurantReviews = (restaurant) => {
  DBHelper.fetchRestaurantReviews(restaurant).then((reviews) => {
    fillReviewsHTML(reviews);
  });
};

/**
 * Create restaurant HTML and add it to the webpage
 * @param {object} restaurant
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  if (restaurant.is_favorite === true || restaurant.is_favorite === 'true') {
    const BlackStar = '&#9733;';
    name.innerHTML = `${BlackStar} ${restaurant.name}`;
  } else {
    name.innerHTML = restaurant.name;
  }

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Restaurant ${restaurant.name} in ${restaurant.neighborhood}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 * @param {object[]} operatingHours
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 * @param {object[]} reviews
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews || reviews.length === 0) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach((review) => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 * @param {object} review
 * @return {HTMLLIElement} list item
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 * @param {object} restaurant
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
};


/**
 * Add restaurant review form
 * @param {number} id Restaurant identity
 */
addNewReviewsButton = ({id}) => {
  const container = document.getElementById('add-review');

  const restaurant = document.createElement('input');
  restaurant.setAttribute('type', 'hidden');
  restaurant.setAttribute('name', 'restaurant_id');
  restaurant.setAttribute('id', 'restaurant_id');
  restaurant.setAttribute('value', id);
  container.appendChild(restaurant);

  const name = document.createElement('input');
  name.setAttribute('type', 'text');
  name.setAttribute('name', 'name');
  name.setAttribute('id', 'reviewer_name');
  name.setAttribute('placeholder', 'Your name');
  name.setAttribute('required', '');
  container.appendChild(name);
  const rating = document.createElement('input');
  rating.setAttribute('type', 'range');
  rating.setAttribute('min', 1);
  rating.setAttribute('max', 5);
  rating.setAttribute('name', 'rating');
  rating.setAttribute('id', 'rating');
  rating.setAttribute('list', 'ratingslist');
  rating.setAttribute('value', 3);
  container.appendChild(rating);
  const ratings = document.createElement('datalist');
  ratings.setAttribute('id', 'ratingslist');
  const ratings1 = document.createElement('option');
  ratings1.setAttribute('value', 1);
  ratings1.setAttribute('label', 1);
  ratings.appendChild(ratings1);
  const ratings2 = document.createElement('option');
  ratings2.setAttribute('value', 2);
  ratings2.setAttribute('label', 2);
  ratings.appendChild(ratings2);
  const ratings3 = document.createElement('option');
  ratings3.setAttribute('value', 3);
  ratings3.setAttribute('label', 3);
  ratings.appendChild(ratings3);
  const ratings4 = document.createElement('option');
  ratings4.setAttribute('value', 4);
  ratings4.setAttribute('label', 4);
  ratings.appendChild(ratings4);
  const ratings5 = document.createElement('option');
  ratings5.setAttribute('value', 5);
  ratings5.setAttribute('label', 5);
  ratings.appendChild(ratings5);
  container.appendChild(ratings);
  const ratingsNumber = document.createElement('span');
  ratingsNumber.innerHTML = 'Rating: 3';
  ratingsNumber.setAttribute('id', 'ratingsnumber');
  container.appendChild(ratingsNumber);
  rating.addEventListener('change', (e) => {
    ratingsNumber.innerHTML = `Rating: ${e.target.value}`;
  });

  const comments = document.createElement('textarea');
  comments.setAttribute('wrap', 'off');
  comments.setAttribute('cols', 30);
  comments.setAttribute('rows', 5);
  comments.setAttribute('name', 'comments');
  comments.setAttribute('id', 'comment_text');
  comments.setAttribute('placeholder', 'Write your review');
  comments.setAttribute('required', '');
  container.appendChild(comments);

  const button = document.createElement('button');
  button.innerHTML = 'Submit review';
  container.appendChild(button);

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration.sync.register('add-review');
      button.addEventListener('click', postReviewSyncHandler);
    });
  } else {
    button.addEventListener('click', postReviewDirectHandler);
  }
};

postReviewSyncHandler = (event) => {
  event.preventDefault();
  const form = document.getElementById('add-review');
  if (form.checkValidity()) {
    const ri = document.getElementById('restaurant_id');
    const n = document.getElementById('reviewer_name');
    const r = document.getElementById('rating');
    const rt = document.getElementById('comment_text');
    const data = {
      action: 'add-review',
      url: `${DBHelper.DATABASE_REVIEWS_URL}/${ri.value}`,
      restaurant_id: Number.parseInt(ri.value),
      name: n.value,
      rating: Number.parseInt(r.value),
      comments: rt.value};

    DBHelper.addToObjectStore('dispatch-queue', data);
    console.log('inform user about request queued successfull');

    form.reset();
    const ratingsNumber = document.getElementById('ratingsnumber');
    ratingsNumber.innerHTML = 'Rating: 3';
  } else {
    form.reportValidity();
  }
};

postReviewDirectHandler = (event) => {
  event.preventDefault();
  const form = document.getElementById('add-review');
  if (form.checkValidity()) {
    const ri = document.getElementById('restaurant_id');
    const n = document.getElementById('reviewer_name');
    const r = document.getElementById('rating');
    const rt = document.getElementById('comment_text');
    const data = {
      restaurant_id: Number.parseInt(ri.value),
      name: n.value,
      rating: Number.parseInt(r.value),
      comments: rt.value};

    DBHelper.postRestaurantReview(data).then((review) => {
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(review));
      form.reset();
      const ratingsNumber = document.getElementById('ratingsnumber');
      ratingsNumber.innerHTML = 'Rating: 3';
    });
  } else {
    form.reportValidity();
  }
};

/**
 * Get a parameter by name from page URL.
 * @param {string} name
 * @param {string} url
 * @return {string} name parameter
 */
getParameterByName = (name, url) => {
  if (!url) {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(url);
  if (!results) {
    return null;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
