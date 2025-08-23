// configs/db.js
import mongoose from "mongoose";
import logger from "./logger.js";

const {
  NODE_ENV,
  SERVICE_NAME,
  DATABASE_URL,
  MONGO_MAX_POOL_SIZE,
  MONGO_MIN_POOL_SIZE,
  MONGO_SERVER_SELECTION_TIMEOUT_MS,
  MONGO_DEBUG,
} = process.env;

const opts = {
  maxPoolSize: Number(MONGO_MAX_POOL_SIZE) || 20,
  minPoolSize: Number(MONGO_MIN_POOL_SIZE) || 0,
  serverSelectionTimeoutMS: Number(MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
  autoIndex: NODE_ENV !== "production",
  appName: SERVICE_NAME || "studytube-api",
};

let listenersWired = false;

function wireConnectionEvents() {
  if (listenersWired) return;
  listenersWired = true;
  mongoose.connection.on("connected", () => logger.info("✅ MongoDB connected (event)"));
  mongoose.connection.on("reconnected", () => logger.info("🔁 MongoDB reconnected"));
  mongoose.connection.on("disconnected", () => logger.warn("⚠️ MongoDB disconnected"));
  mongoose.connection.on("error", (err) => logger.error(`❌ MongoDB error: ${err.message}`));
}

export const connectDB = async ({ retries = 5, delayMs = 2000 } = {}) => {
  if (!DATABASE_URL) {
    logger.error("Missing env: DATABASE_URL");
    process.exit(1);
  }

  const debug = MONGO_DEBUG
    ? ["1", "true", "yes", "on"].includes(MONGO_DEBUG.toLowerCase())
    : NODE_ENV !== "production";
  if (debug) mongoose.set("debug", true);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(DATABASE_URL, opts);
      wireConnectionEvents();
      logger.info("✅ MongoDB connected");
      return mongoose.connection;
    } catch (err) {
      logger.error(`Mongo connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error("Exhausted MongoDB retries. Exiting.");
        process.exit(1);
      }
      const wait = delayMs * attempt; // simple backoff
      await new Promise((res) => setTimeout(res, wait));
    }
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("🔌 MongoDB disconnected");
    }
  } catch (error) {
    logger.error(`❌ Error disconnecting MongoDB: ${error.message}`);
  }
};
