// npm modules;
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
// import createHttpError from "http-errors";
import errorHandler, {
  notFound,
  asyncHandler,
} from "./middlewares/errorHandler.js";
import router from "./routes/mainRoute.js";

asyncHandler;

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
app.use(cors());

//api v1 routes
app.use("/api/v1", router);


// 404
app.use(notFound);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
