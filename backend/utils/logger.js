
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, category }) => {
    return `${timestamp} [${level.toUpperCase()}]${category ? ` [${category}]` : ''}: ${message}`;
  })
);

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create different log files for different categories
const createLoggerWithCategory = (category) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    ),
    defaultMeta: { category },
    transports: [
      // Console output with colorization
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, category }) => {
            return `${timestamp} [${level}]${category ? ` [${category}]` : ''}: ${message}`;
          })
        )
      }),
      
      // Category-specific log file
      new winston.transports.File({ 
        filename: path.join(logDir, `${category}.log`),
        format: logFormat
      }),
      
      // Also log to combined.log
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log'),
        format: logFormat
      }),
      
      // Error logs go to error.log as well
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: logFormat
      })
    ]
  });
};

// Create main logger
const mainLogger = createLoggerWithCategory('system');

// Create specialized loggers
const modbusLogger = createLoggerWithCategory('modbus');
const apiLogger = createLoggerWithCategory('api');
const databaseLogger = createLoggerWithCategory('database');
const securityLogger = createLoggerWithCategory('security');

// Export a combined logger interface
const logger = {
  info: (message, category = 'system') => {
    getLoggerByCategory(category).info(message);
  },
  warn: (message, category = 'system') => {
    getLoggerByCategory(category).warn(message);
  },
  error: (message, err = null, category = 'system') => {
    const logMessage = err ? `${message}: ${err.message || err}` : message;
    getLoggerByCategory(category).error(logMessage);
  },
  debug: (message, category = 'system') => {
    getLoggerByCategory(category).debug(message);
  },
  // Get specific category loggers
  modbus: {
    info: (message) => modbusLogger.info(message),
    warn: (message) => modbusLogger.warn(message),
    error: (message, err = null) => {
      const logMessage = err ? `${message}: ${err.message || err}` : message;
      modbusLogger.error(logMessage);
    },
    debug: (message) => modbusLogger.debug(message)
  },
  api: {
    info: (message) => apiLogger.info(message),
    warn: (message) => apiLogger.warn(message),
    error: (message, err = null) => {
      const logMessage = err ? `${message}: ${err.message || err}` : message;
      apiLogger.error(logMessage);
    },
    debug: (message) => apiLogger.debug(message)
  },
  database: {
    info: (message) => databaseLogger.info(message),
    warn: (message) => databaseLogger.warn(message),
    error: (message, err = null) => {
      const logMessage = err ? `${message}: ${err.message || err}` : message;
      databaseLogger.error(logMessage);
    },
    debug: (message) => databaseLogger.debug(message)
  },
  security: {
    info: (message) => securityLogger.info(message),
    warn: (message) => securityLogger.warn(message),
    error: (message, err = null) => {
      const logMessage = err ? `${message}: ${err.message || err}` : message;
      securityLogger.error(logMessage);
    },
    debug: (message) => securityLogger.debug(message)
  },
};

// Helper function to get logger by category
function getLoggerByCategory(category) {
  switch(category) {
    case 'modbus': 
      return modbusLogger;
    case 'api': 
      return apiLogger;
    case 'database': 
      return databaseLogger;
    case 'security': 
      return securityLogger;
    default:
      return mainLogger;
  }
}

module.exports = logger;
