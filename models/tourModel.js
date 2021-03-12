const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must be less or equal to 40 characters'],
      minlength: [10, 'A tour name must be 10 characters or greater'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'], // Don't like this because doesn't match white space. May write regex soon.
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Tour difficulty must be easy, medium, or difficult.',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be 1 or greater'],
      max: [5, 'Rating must be less than or equal to 5'],
      set: (val) => Math.round(val * 10) / 10, // this runs each time a new value for this field is set. This rounds the ratings average. 4.66666 --> 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // this only points to the current doc on NEW document creation, not updating.
        validator: function (val) {
          return val < this.price; //Eg: if the val is 50 and the price is 200, that makes for a total of 150. That's good and true. If the price is 50 and we try to discount 100, that is false.
        },
        message: 'Discount price ({VALUE}) should be less than regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      // select: false, // Hides sensitive information
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // geoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, This was for getting an array of guide IDs to be mapped over to make new embedded documents.
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true }, // Each time the data is outputted as JSON we want virtuals to be part of output
    toObject: { virtuals: true }, // When the data gets outputted as an object we want the virtuals as well.
  }
);

// tourSchema.index({ price: 1 }); // 1 means we are sorting price index in ascending order versus -1 for descending.
tourSchema.index({ price: 1, ratingsAverage: -1 }); // compound index
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // startLocation should be indexed to a 2d sphere.

// DOCUMENT MIDDLEWARE
// Cannot use virtual properties in query like Tour.find().where('durationWeeks').equals(1) because they are not part of the database.
tourSchema.virtual('durationWeeks').get(function () {
  // Using regular function and not arrow function because arroy function doesn't get its own this keyword.this in this case points to the current document.
  return this.duration / 7;
});

// Virtual population of reviews. This allows me to have a reference to all child docs on parent doc without persisting that info to the DB.
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //where the ID of the tour is stored in the review
  localField: '_id', // Where that same ID is stored in the tour model
});

// .pre event runs before event. Pre save hook/mmiddleware. This one is document middleware that runs before the .save() and .create() commands, but not .insertMany().
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Embeds guide user documents into tour documents. Changing from embedding because what if a guide changes role from guide to lead guide or changes email, we would have to check if a tour has that user as a guide then update the embedded guide in the tour. Going to implement referencing.
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save the document...');
//   next();
// });

// // Post middleware is executed after all pre middlewares have completed. It has access to the doc that was just saved to the database.
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE - use case: suppose we have secret tours in database just for VIP people that public shouldn't know about. Don't want
// secret tours to appear in result outputs. Will create secret tour field and then query only for tours that are not secret
tourSchema.pre(/^find/, function (next) {
  //could have put 'find' in quotes but this is better as a regex because it now triggers for findOne, FindOneAndDelete, etc.
  this.find({ secretTour: { $ne: true } }); // this is a query object so we can chain all the methods for query. Writing not equal to false instead of { secretTour: true } because I want to see the ones with no secretTour specification.

  this.start = Date.now();
  next();
});

// All queries will now automatically populate the guides field with the reference users
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedOn',
  });

  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
});

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  // this.pipeline() is the array that was passed into the aggregate function below. To filter out the secret tours, add another match stage right at the beginning of this pipeline
  if (!Object.keys(this.pipeline()[0])[0] === '$geoNear') {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
