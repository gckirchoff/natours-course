module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err)); // could also write .catch(next) because the function is automatically called with the parameter that the callback receives. This will make the error end up in the global error handling middleware.
  };
};
