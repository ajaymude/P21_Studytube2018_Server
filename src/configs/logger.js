// configs/logger.config.js
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/* ---------- Env & levels ---------- */
const isProd = process.env.NODE_ENV === "production";
const isDev  = process.env.NODE_ENV === "development";
const logLevel = isDev ? "debug" : "info";

const customLevels = {
  levels: { error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6 },
  colors: { error: "red", warn: "yellow", info: "green", http: "magenta", verbose: "cyan", debug: "blue", silly: "grey" },
};
winston.addColors(customLevels.colors);

/* ---------- Formats ---------- */
const redact = winston.format((info) => {
  const SENSITIVE_KEYS = ["authorization", "password", "token", "accessToken", "refreshToken", "apiKey", "secret"];
  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (SENSITIVE_KEYS.includes(k)) obj[k] = "***REDACTED***";
      else if (typeof v === "object") walk(v);
    }
    return obj;
  };
  return walk(info);
});

const baseFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  redact(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.splat()
);

const consoleFormat = isProd
  ? winston.format.json()
  : winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const msg = stack || message;
        const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level}: ${msg}${rest}`;
      })
    );

/* ---------- Transports ---------- */
const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    stderrLevels: ["error"],
  }),
];

// enable file rotation in prod or when explicitly requested
const enableFiles = isProd || process.env.LOG_TO_FILES === "true";
if (enableFiles) {
  transports.push(
    new DailyRotateFile({
      dirname: "logs",
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: logLevel,
    }),
    new DailyRotateFile({
      dirname: "logs",
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    })
  );
}

/* ---------- Logger ---------- */
const logger = winston.createLogger({
  level: logLevel,
  levels: customLevels.levels,
  format: baseFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || "app",
    env: process.env.NODE_ENV || "development",
  },
  transports,
  exceptionHandlers: [
    new winston.transports.Console({ format: consoleFormat }),
    ...(enableFiles
      ? [
          new DailyRotateFile({
            dirname: "logs",
            filename: "exceptions-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "30d",
            level: "error",
          }),
        ]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: consoleFormat }),
    ...(enableFiles
      ? [
          new DailyRotateFile({
            dirname: "logs",
            filename: "rejections-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "30d",
            level: "error",
          }),
        ]
      : []),
  ],
});

/* ---------- Helpers ---------- */
export const getLogger = (label) => logger.child({ label });

logger.stream = {
  write: (message) => {
    logger.http(message.trim()); // thanks to customLevels
  },
};

export default logger;
