/**
 * Professional logging utility
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LOG_LEVEL = process.env.LOG_LEVEL || "INFO";
const CURRENT_LEVEL = LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.INFO;

class Logger {
  constructor(prefix = "") {
    this.prefix = prefix;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}]` : "";
    let logMessage = `${timestamp} [${level}] ${prefix} ${message}`;
    
    if (data) {
      logMessage += ` ${JSON.stringify(data)}`;
    }
    
    return logMessage;
  }

  debug(message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(this.formatMessage("DEBUG", message, data));
    }
  }

  info(message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(this.formatMessage("INFO", message, data));
    }
  }

  warn(message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage("WARN", message, data));
    }
  }

  error(message, error = null) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
      } : null;
      console.error(this.formatMessage("ERROR", message, errorData));
    }
  }
}

export default Logger;
export const createLogger = (prefix) => new Logger(prefix);

