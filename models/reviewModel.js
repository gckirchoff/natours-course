const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Tell us what you thought!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please leave a rating when writing your review'],
    },
    createdOn: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // Each combo of tour and use must be unique. Now, someone can just write one review per tour.

// Getting rid of populating the tour ID because that created a long chain of populates.
// reviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'user',
//     select: 'name photo',
//   }).populate({
//     path: 'tour',
//     select: 'name',
//   });
//   next();
// });

// Populating the reviews with what user wrote them. Originally had the tour too, but that didn't provide enough valuable info for the performance costs.
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// Static method: Review.calculate. this points to current model in static method.
reviewSchema.statics.calculateAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        numRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Update review stats after review is posted
reviewSchema.post('save', function () {
  // In this kind of middleware this points to current review about to be saved

  // This is the tour. Constructor is the model that created the tour.
  this.constructor.calculateAverageRatings(this.tour);
});

// Query middlewhere for findbyIdAndUpdate and findByIdAndDelete to update query stats
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne(); // finds the doc/review currently being processed before it is processed. What I want is the tour id from this. r stands for review. this.r saves this data to pass it to the next post middleware.
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // Await this.findOne() does not work here (.post) because the query has already executed.
  await this.r.constructor.calculateAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
