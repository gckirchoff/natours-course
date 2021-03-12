const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please enter your email.'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password.'],
    validate: {
      // This only works on save, on .create() and .save()
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords must match',
    },
  },
  passwordChangedOn: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // Return and next immediately if password was modified. isModified is available on all docs.
  if (!this.isModified('password')) return next();

  // Hash the password with a cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the passwordConfirm field because that was just required for the input
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedOn = Date.now() - 1000; // Sometimes the password is changed with a little delay. This ensures that the token is created after the  password was changed.
  next();
});

// Query middleware to not show
userSchema.pre(/^find/, function (next) {
  // this points to current query
  this.find({ active: { $ne: false } });
  next();
});

// Making an instance method: a method that is available on all documents of a certain collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Checks if the password was changed since the web token was given. What if a user had their token taken and changed their password to stop them?
userSchema.methods.changedPasswordAfterTokenIssued = function (JWTTimeStamp) {
  // If the passwordChangedAt property exists, do the comparison. If it doesn't exist, the user never changed the password and we can just return false.
  if (this.passwordChangedOn) {
    const changedTimeStamp = parseInt(
      this.passwordChangedOn.getTime() / 1000,
      10
    ); // divide by 1000 because changedTimeStamp is in miliseconds. This gives us seconds.

    return JWTTimeStamp < changedTimeStamp; // token issued at time 100 and password was changed at time 200. This means password was changed after token was given. Thus, it is TRUE that password was changed after token was given. If the password was changed at 400 and the token was given at 500, no problem.
  }

  // False means not changed.
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
