const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// Serving static files like css, html, images, etc.
app.use(express.static(path.join(__dirname, 'public')));

// /////////////////////////////////////////////////////////////////////////
// GLOBAL MIDDLEWARES

// Set security HTT headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body. Don't accept body larger than 10kb
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Sanitize data against NoSQL query injections. What this middleware does is look at req.body, req.queryString, and req.params and then filters out all $ and .
app.use(mongoSanitize());

// Sanitize data against cross side scripting attacks (XSS). Cleans user input from malicious html code, which could have some js code attached to it, which would inject itself into our html side.
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// app.get('/', (req, res) => {
//   res.status(200).json({ message: 'Hello from the server', app: 'Natours' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint');
// });

// /////////////////
// ROUTE HANDLERS

// ///////////////////////////
// ROUTES

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handle all urls that did not hit a designated route
app.all('*', (req, res, next) => {
  next(new AppError(`Could not find url ${req.originalUrl}`, 404));

  //   res.status(404).json({
  //     status: 'fail',
  //     message: `Could not find url ${req.originalUrl}`,
  //   });

  // const err = new Error(`Could not find url ${req.originalUrl}`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // next(err); // If anything is passed into next() it is assumed to be an error which skips all other middlewares and send that error to the global error handling middleware which is then executed.
});

app.use(globalErrorHandler);

module.exports = app;
