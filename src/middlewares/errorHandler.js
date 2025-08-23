
// Custom operational error
export class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true; // distinguish known/expected errors
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/* ---------- Helpers for specific error types (Mongoose etc.) ---------- */
const castErrorHandler = (err) => {
  const msg = `Invalid value for ${err.path}: ${err.value}!`;
  return new CustomError(msg, 400);
};

const duplicateKeyErrorHandler = (err) => {
  // handle any unique field, not only "name"
  const key = Object.keys(err.keyValue || {})[0];
  const val = err.keyValue?.[key];
  const msg = `Duplicate value for "${key}": ${val}. Please use another value.`;
  return new CustomError(msg, 400);
};

const validationErrorHandler = (err) => {
  const errors = Object.values(err.errors || {}).map((v) => v.message);
  const msg = `Invalid input data: ${errors.join(". ")}`;
  return new CustomError(msg, 400);
};

/* ---------- Dev / Prod responders ---------- */
const sendDev = (res, error) => {
  res.status(error.statusCode).json({
    status: error.status,
    statusCode: error.statusCode,
    message: error.message,
    stack: error.stack,
    error, // raw error (helpful in dev)
  });
};

const sendProd = (res, error) => {
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.status,
      statusCode: error.statusCode,
      message: error.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Something went wrong! Please try again later.",
    });
  }
};

/* ---------- The actual Express error middleware ---------- */
export default function errorHandler(error, req, res, next) {
  const env = process.env.NODE_ENV || "development";
  // Ensure defaults so we can always read them
  error.statusCode = error.statusCode || 500;
  error.status = error.status || (error.statusCode >= 500 ? "error" : "fail");

  if (env === "development") {
    return sendDev(res, error);
  }

  // In production: transform known errors to operational CustomError
  let transformed = error;

  if (error.name === "CastError") transformed = castErrorHandler(error);          // Mongoose bad ObjectId
  if (error.code === 11000) transformed = duplicateKeyErrorHandler(error);        // Mongoose unique index
  if (error.name === "ValidationError") transformed = validationErrorHandler(error);

  return sendProd(res, transformed);
}

/* ---------- Optional: not-found middleware ---------- */
export function notFound(req, res, next) {
  next(new CustomError(`Route ${req.originalUrl} not found`, 404));
}

/* ---------- Optional: async handler helper ---------- */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
