const AppError = require('../utils/appError');

const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please long in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // B) Rendered website
  console.error('ERROR', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: err.message,
  });
};

const sendErrorProduction = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // A) API Operational errors are trusted, so we can send that error.
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //  However, with programming/other unknown errors, we don't want to leak error details.
    console.error('ERROR', err); // Us developers want to know what's going on though.

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
  // B) RENDERED WEBSITE
  // A) API Operational errors are trusted, so we can send that error.
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later.',
    });
  }
  // B)  However, with programming/other unknown errors, we don't want to leak error details.
  console.error('ERROR', err); // Us developers want to know what's going on though.
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.assign(err);

    // Meaning that mongodb couldn't find the correct tour. It sends cast error.
    if (error.name === 'CastError') error = handleCastErrorDB(error);

    // Trying to create tour with same name as one in database.
    if (error.code === 11000) error = handleDuplicateFieldDB(error);

    // If not updating tour correctly and running into validation error
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    // If JWT fails signature verification
    if (err.name === 'JsonWebTokenError') error = handleJWTError();

    // If JWT token expired
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProduction(error, req, res);
  }
};
