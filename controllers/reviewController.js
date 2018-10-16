const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  req.body.author = req.user._id;
  req.body.blizzard = req.params.id;
  req.body.created = Date.now();

  if (!req.body.rating) {
    req.flash(
      'error',
      'You did not provide a rating. Please select a rating out of 5.'
    );
    res.redirect('back');
    return;
  }

  // If user has already submitted a review for this blizzard, overwrite the old
  // review with the new review.
  review = await Review.findOneAndUpdate(
    { author: req.body.author, blizzard: req.body.blizzard },
    req.body,
    {
      new: true,
      // If the DB document isn't found, create a new one via `upsert` option:
      // https://mongoosejs.com/docs/api.html#model_Model.findOneAndUpdate
      upsert: true
    }
  );

  // console.log(review);

  req.flash('success', 'Thanks! Your new review has been added.');
  res.redirect('back');
};
