const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Global synchronous error handler
process.on('uncaughtException', (err) => {
  console.log(err.name, '-', err.message);
  console.log('Uncaught exception, shutting down...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  // .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB CONNECTION SUCCESS')); //could put a .catch(err => console.log('ERROR')) here in case the database is down, password wrong, etc, but I want to catch unhandled errors globally.

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App is running on port ${port}...`);
});

// Global unhandled asyncronous errors
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection, shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
