const mongoose = require('mongoose');
const Blizzard = mongoose.model('Blizzard');
const Review = mongoose.model('Review');
const User = mongoose.model('User');
const multer = require('multer');
const cloudinary = require('cloudinary');
const cloudinaryStorage = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: process.env.CLOUDINARY_FOLDER,
  allowedFormats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
  transformation: [{ width: 900, crop: 'limit' }]
});

const multerOptions = {
  storage: storage,
  limits: { fileSize: 1000 * 1000 * 10 }, // Ten MB max file size
  fileFilter: function(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      // If you call `next()` and pass it value(s), the first param should
      // always be an error (error first callback).
      // If you call `next()` with a second param, and the first param as
      // `null`, the second param will be passed along to the next in line call.
      next(null, true);
    } else {
      next(
        {
          message:
            'Inncorrect file size or type. Please upload files no larger than 10MB.'
        },
        false
      );
    }
  }
};

const confirmBlizzardOwner = (blizzard, user) => {
  if (!blizzard.author.equals(user._id)) {
    return false;
  }
  return true;
};

// CREATE BLIZZARD (ROUTE)
exports.createBlizzard = async (req, res) => {
  // Associate a blizzard with a given user
  req.body.author = req.user._id;
  const blizzard = await new Blizzard(req.body).save();
  req.flash(
    'success',
    `Your blizzard <strong>${
      blizzard.name
    }</strong> has been added! You may now <a href="/blizzard/${
      blizzard.slug
    }#review">write a review for it</a>. Only blizzards that have at least two reviews will appear in the rating system, such as the <a href="/#top-ten">Top Ten</a>.`
  );
  res.redirect(`/blizzard/${blizzard.slug}`);
};

// ADD BLIZZARD FORM
exports.addBlizzard = (req, res) => {
  res.render('editBlizzard', { title: 'Add a Blizzard' });
};

// LIST ALL BLIZZARDS
exports.getBlizzards = async (req, res) => {
  const blizzards = await Blizzard.find()
    .populate('reviews')
    .sort({ name: 1 });
  res.render('blizzards', {
    title: 'Look at All Them Blizzards!',
    tagline: 'All blizzards listed alphabetically.',
    blizzards
  });
};

// LIST MY FAVORITE BLIZZARDS (and potential suggestions)
exports.myFavoriteBlizzards = async (req, res) => {
  // Get the size of the Blizzard table
  //const blizzardTableSize = await Blizzard.count();

  // All current user's reviews
  const currentUserReviewsPromise = Review.find({
    author: req.user._id
  });

  // Random top reviews.
  // Passing `blizzardTableSize` would increase the impartiality here.
  const sampleReviewsPromise = Review.getRandomTopReviews(25);

  // All current user's favorite blizzards
  const favoriteBlizzardsPromise = await Blizzard.find({
    _id: { $in: req.user.favorites }
  });

  // Fire off our promises/requests to the DB
  const results = await Promise.all([
    currentUserReviewsPromise,
    sampleReviewsPromise,
    favoriteBlizzardsPromise
  ]);

  const favoriteBlizzards = results[2];

  // Vars to hold our suggestions and common blizzards
  const suggestions = [];
  let commonBlizzards = 0;

  const userReviewIDs = [];
  results[0].forEach(review => {
    userReviewIDs.push(review.blizzard);
  });

  const sampleTopReviews = results[1];
  sampleTopReviews.forEach(review => {
    if (userReviewIDs.includes(review.blizzard)) {
      if (review.rating > 3) {
        commonBlizzards++;
      }
    } else {
      suggestions.push(review.blizzard);
    }
  });

  const smartGuess = false;

  if (typeof sampleTopReviews[0] == 'undefined') {
    res.render('blizzards', {
      title: 'Your Favorite Blizzards',
      blizzards: favoriteBlizzards
    });
  } else {
    const suggestedBlizzardId = sampleTopReviews[0].blizzard;
    // If we have more data, we can make a better suggestion
    if (suggestions.length && commonBlizzards) {
      suggestedBlizzardId = suggestions[0];
      smartGuess = true;
    }

    // Get the suggested blizzard from DB
    const suggestedBlizzard = await Blizzard.findOne({
      _id: suggestedBlizzardId
    }).lean();

    if (suggestedBlizzard) {
      suggestedBlizzard.smartGuess = smartGuess;
    }

    res.render('blizzards', {
      title: 'Your Favorite Blizzards',
      blizzards: favoriteBlizzards,
      suggestedBlizzard
    });
  }
};

// LIST ALL TIME FAVORITE BLIZZARDS -- not in use
exports.getCommunityFavoriteBlizzards = async (req, res) => {
  // TODO: Figure out how to do this with a MongoDB aggregation
  // Aparently, we cannot lookup ObjectId() as a String!?
  // https://stackoverflow.com/a/41690223/1171790
  const users = await User.find({}, { favorites: 1 });
  let sumTotalFavorites = 0;

  // Get a list of all of the users' favorite blizzards.
  const favorites = [];
  users.forEach(user => {
    if (user.favorites.length) {
      user.favorites.forEach(favorite => favorites.push(favorite));
    }
  });

  // Get a count of unique favorites for each blizzard
  const uniqueFavorites = {};
  favorites.forEach(favorite => {
    if (uniqueFavorites[favorite]) {
      uniqueFavorites[favorite] = uniqueFavorites[favorite] + 1;
    } else {
      uniqueFavorites[favorite] = 1;
    }
    sumTotalFavorites++;
  });

  // `.lean()` method will allow us to modify the array when returned from Mongo
  // https://stackoverflow.com/a/18070111/1171790
  const blizzards = await Blizzard.find().lean();

  // Add the `popularity` and `percentage` fields to each blizzard
  blizzards.forEach(blizzard => {
    blizzard.popularity = uniqueFavorites[blizzard._id] || 0;
    blizzard.popularityPercentage =
      (blizzard.popularity / sumTotalFavorites) * 100;
  });

  // Sort the blizzards by the popularity field
  blizzards.sort(function(a, b) {
    return b.popularity - a.popularity;
  });

  res.json(blizzards);
};

// LIST HIGHEST RATED BLIZZARDS (homepage)
exports.getHighestRated = async (req, res) => {
  const blizzards = await Blizzard.getHighestRated();
  res.render('index', {
    title: 'The Top 10 Highest Rated Blizzards',
    tagline: 'The best of the best.',
    blizzards
  });
};

// SINGLE BLIZZARD
exports.getBlizzardBySlug = async (req, res, next) => {
  const blizzards = await Blizzard.getSingleRated(req.params.slug);

  // If we ain't got a blizzard, call `next()` which will move along past
  // routes and call errorHandlers.notFound
  if (!blizzards.length) return next();

  const blizzard = blizzards[0];

  // TODO: Fix. Make more efficient. Cloud probably do this in the DB...
  blizzard.reviews.forEach((review, i) => {
    blizzard.reviewUsers.forEach(user => {
      if (review.author.toString() == user._id.toString()) {
        blizzard.reviews[i].authoremail = user.email;
        blizzard.reviews[i].authorname = user.name;
      }
    });
  });

  const userId = typeof req.user !== 'undefined' ? req.user._id : null;

  res.render('blizzard', {
    title: blizzard.name || 'Blizzard Page',
    blizzard,
    userId
  });
};

// EDIT BLIZZARD FORM
exports.editBlizzard = async (req, res) => {
  const blizzard = await Blizzard.findOne({ _id: req.params.id });
  if (confirmBlizzardOwner(blizzard, req.user._id)) {
    res.render('editBlizzard', {
      title: `Editing: <a href="/blizzard/${blizzard.slug}">${
        blizzard.name
      }</a>`,
      blizzard,
      actionText: 'Update Blizzard'
    });
  } else {
    req.flash(
      'error',
      'Sorry, you cannot edit a Blizzard if you did not create it.'
    );
    res.redirect('back');
  }
};

// UPDATE BLIZZARD (ROUTE)
exports.updateBlizzard = async (req, res) => {
  const blizzard = await Blizzard.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    {
      // `new` will return the new (updated) blizzard instead of the old one
      new: true,
      runValidators: true
    }
  ).exec();
  req.flash(
    'success',
    `Updated: <em><a title="View ${blizzard.name}" href="/blizzards/${
      blizzard.slug
    }">${blizzard.name}</a></em>`
  );
  res.redirect(`/blizzard/${blizzard._id}/edit`);
};

exports.upload = multer(multerOptions).single('photo');

exports.addCloudinaryRes = async (req, res, next) => {
  // If we do not have a file in our request, just move along and call `next()`.
  if (!req.file) {
    return next();
  }

  // Set our photoID/URL to the returned value(s) from Cloudinary so that we can
  // store the photo path in our DB.
  req.body.cloudinaryId = req.file.public_id;

  next();
};

// API STUFF -------------------------------------------------------------------

// Search Blizzards
exports.searchBlizzards = async (req, res) => {
  const blizzards = await Blizzard.find(
    {
      $text: {
        $search: req.query.q
      }
    },
    {
      score: { $meta: 'textScore' }
    }
  )
    .sort({
      // sort results by `score`
      score: { $meta: 'textScore' }
    })
    .limit(20);
  res.json(blizzards);
};

// Favorite Blizzard
exports.favoriteBlizzard = async (req, res) => {
  // The returned value from the DB will be an array of objects.
  // However, we need to convert to an array of (ID) strings.
  const favorites = req.user.favorites.map(obj => obj.toString());
  // Are we adding the favorites or are we removing this favorite?
  // If the `favorites` already includes the favorite ID, remove the favorite.
  // Otherwise, do the inverse.
  const operator = favorites.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      [operator]: { favorites: req.params.id }
    },
    {
      // Return the newly edited array of favorites
      new: true
    }
  );
  res.json(user);
};
