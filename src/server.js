import "dotenv/config";
import app from "./app.js";
import logger from "./configs/logger.js";
import { connectDB, disconnectDB } from "./configs/db.js";

const PORT = Number(process.env.PORT || 8000);

let server;

(async () => {
  try {
    // 1) Connect DB first (fail fast if DB is down)
    await connectDB();

    // 2) Start HTTP server once
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    // (optional) catch server-level errors like EADDRINUSE
    server.on("error", (err) => {
      logger.error(`HTTP server error: ${err.message}`);
      shutdown(1, "server-error");
    });
  } catch (err) {
    logger.error(`Startup failure: ${err?.stack || err}`);
    await disconnectDB();
    process.exit(1);
  }
})();

// -------- Graceful shutdown ----------
const shutdown = async (code = 0, reason = "shutdown") => {
  try {
    logger.info(`[${reason}] graceful shutdown…`);
    if (server) {
      await new Promise((resolve) => server.close(resolve)); // stop accepting new reqs
      logger.info("HTTP server closed");
    }
    await disconnectDB();
  } catch (err) {
    logger.error(`Shutdown error: ${err?.stack || err}`);
    code = 1;
  } finally {
    process.exit(code);
  }
};

// OS signals
process.on("SIGINT", () => shutdown(0, "SIGINT")); // Ctrl+C
process.on("SIGTERM", () => shutdown(0, "SIGTERM")); // containers/orchestrators

// Crash protection (log → graceful shutdown → exit 1)
process.on("uncaughtException", (err) => {
  logger.error(`uncaughtException: ${err?.stack || err}`);
  shutdown(1, "uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  logger.error(`unhandledRejection: ${reason?.stack || reason}`);
  shutdown(1, "unhandledRejection");
});
