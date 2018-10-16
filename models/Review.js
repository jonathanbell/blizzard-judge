const mongoose = require('mongoose');
const xss = require('xss');

const reviewSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now()
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author.'
  },
  blizzard: {
    type: mongoose.Schema.ObjectId,
    required: 'You must supply a blizzard for review.',
    ref: 'Blizzard'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: "You didn't provide a rating. Please provide a rating."
  },
  text: String,
  cloudinaryId: String
});

reviewSchema.statics.getRandomTopReviews = function(sampleSize) {
  return this.aggregate([
    { $match: { rating: { $gte: 5 } } },
    { $sample: { size: sampleSize } }
  ]);
};

reviewSchema.pre('save', async function(next) {
  // Strip any malicious `<script>` tags or html from our inputs
  this.text = this.text.replace(/(?:\r\n|\r|\n)/g, '<br>');
  this.text = xss(this.text, {
    whiteList: {
      br: ['foo']
    }
  });
  if (this.cloudinaryId) {
    this.cloudinaryId = xss(this.cloudinaryId);
  }

  next();
});

// Automagically populate the `author` field with the ObjectID of the user
// whenever this model is searched upon.
function autopopulate(next) {
  this.populate('author');
  next();
}
reviewSchema.pre('find', autopopulate);
reviewSchema.pre('findOne', autopopulate);
reviewSchema.pre('findOneAndUpdate', autopopulate);

module.exports = mongoose.model('Review', reviewSchema);
