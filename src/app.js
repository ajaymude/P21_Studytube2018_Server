// npm modules;
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
// import createHttpError from "http-errors";
import errorHandler, { notFound } from "./middlewares/errorHandler.js";
import router from "./routes/mainRoute.js";

const allowed = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOptions = {
  origin: (origin, cb) => {
    // allow non-browser tools (no origin) and our dev hosts
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  maxAge: 86400, // cache preflight
  optionsSuccessStatus: 204,
};

//create express app
const app = express();

//morgan
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

//helmet
app.use(helmet());

//parse json request url
app.use(express.json());

//parse json request body
app.use(express.urlencoded({ extended: true }));

//sanitize request data
// app.use(mongoSanitize());

//enable cookie parser
app.use(cookieParser());

//gzip compression
app.use(compression());

//cors
// BEFORE your routes
app.use(cors(corsOptions));

//api v1 routes
app.use("/api/v1", router);

// 404
app.use(notFound);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
