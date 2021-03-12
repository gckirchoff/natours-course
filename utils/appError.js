class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Message is the only param that the built in error accepts

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'Fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
