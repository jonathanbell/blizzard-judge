const mongoose = require('mongoose');
const mongodbErrorHandler = require('mongoose-mongodb-errors');

// We tell mongoose to use the global/default promise method (included in ES6)
// `global` is sorta like `window` in the browser (superglobal)
mongoose.Promise = global.Promise;

const slug = require('slugs');
const xss = require('xss');

const blizzardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      unique: true,
      required: 'A valid blizzard name is required.'
    },
    slug: String,
    description: {
      type: String,
      trim: true,
      required:
        "Please provide a brief description of this blizzard. What are it's ingredients?"
    },
    created: {
      type: Date,
      default: Date.now
    },
    docsUrl: String,
    cloudinaryId: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: 'You must supply a Blizzard author.'
    }
  },
  {
    // Make sure that virtual fields are output/pass to the calling controller
    // (by default, they are NOT!)
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Deffine DB indexes - this, in theroy, will make our AJAX search faster.
blizzardSchema.index({
  name: 'text',
  description: 'text'
});

blizzardSchema.plugin(mongodbErrorHandler);

blizzardSchema.pre('save', async function(next) {
  // Strip any malicious `<scipt>` tags or html from our inputs
  this.name = xss(this.name);
  this.description = xss(this.description).replace(/(?:\r\n|\r|\n)/g, '<br>');
  this.description = xss(this.description, {
    whiteList: {
      br: ['foo']
    }
  });
  if (this.cloudinaryId) {
    this.cloudinaryId = xss(this.cloudinaryId);
  }

  // If our blizzard `name` has changed (or is brand new), we need to check if
  // it is exactly the same as an existing blizzard name because we create
  // unique slugs based off of the blizzard name.
  if (this.isModified('name')) {
    this.slug = slug(this.name);

    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const blizzardsWithMatchingSlugs = await this.constructor.find({
      slug: slugRegEx
    });

    // If we have matching slugs, increment "-n" onto the end of the new slug.
    if (blizzardsWithMatchingSlugs.length) {
      this.slug = `${this.slug}-${blizzardsWithMatchingSlugs.length + 1}`;
    }

    // TODO: Check if the blizzard title already exists in the database
    // (avoid duplicate blizzards) and return a human readable error if so.
  }

  next();
});

// Find reviews where the blizzard._id property is the same as the `review` _id property
blizzardSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'blizzard'
});

blizzardSchema.statics.getHighestRated = function() {
  return this.aggregate([
    // Lookup each blizzard and add a reviews field (as an array) of reviews
    // for that blizzard.
    {
      $lookup: {
        // This is kinda confusing. MongoDB will take the model name and
        // make it lowercase, and add an 's' onto the end inside a $lookup.
        from: 'reviews',
        localField: '_id',
        foreignField: 'blizzard',
        as: 'reviews'
      }
    },
    // Filter the returned list for blizzards that have 2 or more reviews.
    {
      // A *second* item must exist in the array of matched documents.
      // (`reviews` is zero-based)
      $match: { 'reviews.1': { $exists: true } }
    },
    // Add a field for the average rating of a blizzard
    {
      $addFields: {
        // Create a new field called "averageRating" and set that to the value
        // of the average of`reviews.rating`
        averageRating: { $avg: '$reviews.rating' }
      }
    },
    // Sort by average rating
    {
      $sort: { averageRating: -1 }
    },
    // Limit to 10 highest rated blizzards
    {
      $limit: 10
    }
  ]);
};

blizzardSchema.statics.getSingleRated = function(slugId) {
  return this.aggregate([
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'blizzard',
        as: 'reviews'
      }
    },
    {
      $match: {
        slug: slugId
      }
    },
    { $limit: 1 },
    {
      $addFields: {
        averageRating: { $avg: '$reviews.rating' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'reviews.author',
        foreignField: '_id',
        as: 'reviewUsers'
      }
    }
  ]);
};

function autopopulate(next) {
  this.populate('reviews');
  next();
}

blizzardSchema.pre('find', autopopulate);
blizzardSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Blizzard', blizzardSchema);
