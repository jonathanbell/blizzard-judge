const express = require('express');
const router = express.Router();
const blizzardController = require('../controllers/blizzardController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// Create Blizzard
router.get(
  '/blizzard/add',
  authController.isLoggedIn,
  blizzardController.addBlizzard
);
router.post(
  '/blizzard/add',
  authController.isLoggedIn,
  // Sends the file data to the server and validates it via the multer options.
  // Then uploads the file to cloudinary.
  blizzardController.upload,
  // Adds the returned values from Cloudinary into our request body (`req.body`)
  catchErrors(blizzardController.addCloudinaryRes),
  // Create new blizzard with a fully populated `req.body` object.
  catchErrors(blizzardController.createBlizzard)
);

// Display Blizzard
router.get(
  '/blizzard/:slug',
  catchErrors(blizzardController.getBlizzardBySlug)
);

// Display Blizzards
router.get('/', catchErrors(blizzardController.getHighestRated));
router.get('/blizzards', catchErrors(blizzardController.getBlizzards));
router.get(
  '/blizzards/my-favorites',
  authController.isLoggedIn,
  catchErrors(blizzardController.myFavoriteBlizzards)
);

// Edit Blizzard
router.get(
  '/blizzard/:id/edit',
  authController.isLoggedIn,
  catchErrors(blizzardController.editBlizzard)
);
router.post(
  '/blizzard/add/:id',
  authController.isLoggedIn,
  blizzardController.upload,
  catchErrors(blizzardController.addCloudinaryRes),
  catchErrors(blizzardController.updateBlizzard)
);

// TODO: Delete Blizzard

// Create a Review
router.post(
  '/blizzard/:id/review',
  authController.isLoggedIn,
  blizzardController.upload,
  catchErrors(blizzardController.addCloudinaryRes),
  catchErrors(reviewController.addReview)
);

// User register/create
router.get('/become-a-blizzard-tester', userController.signupForm);
router.post(
  '/become-a-blizzard-tester',
  userController.validateRegistration,
  userController.register,
  authController.login
);

// User login form
router.get('/login', userController.loginForm);
// User login route
router.post('/login', authController.login);
// User forgot password form
router.get('/forgot', userController.forgotPasswordForm);

// User edit form
router.get(
  '/account',
  authController.isLoggedIn,
  catchErrors(userController.updateForm)
);
// User edit route
router.post(
  '/account',
  authController.isLoggedIn,
  catchErrors(userController.update)
);

// User forgot password routes
router.post('/account/forgot', catchErrors(authController.forgotPassword));
// User forgot password token reset page
router.get('/account/reset/:token', catchErrors(authController.reset));
// User forgot password token reset route
router.post(
  '/account/reset/:token',
  authController.confirmNewPassword,
  catchErrors(authController.update)
);

// User logout
router.get('/logout', authController.logout);

/**
 * Static Pages
 */

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About'
  });
});

/**
 * API Endpoints
 */

// Search
router.get('/api/v1/search', catchErrors(blizzardController.searchBlizzards));
// Favorite/unfavorite blizzard
router.post(
  '/api/v1/blizzard/:id/favorite',
  catchErrors(blizzardController.favoriteBlizzard)
);

module.exports = router;
