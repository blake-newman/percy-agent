"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors = require("colors");
const winston = require("winston");
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
function createConsoleTransport() {
    return new winston.transports.Console({
        level: LOG_LEVEL,
        stderrLevels: ['error'],
        format: winston.format.combine(winston.format.label({ label: colors.magenta('percy') }), winston.format.printf(({ label, message }) => `[${label}] ${message}`)),
    });
}
const logger = winston.createLogger({
    transports: [createConsoleTransport()],
});
function profile(id, meta) {
    if (LOG_LEVEL === 'debug') {
        return logger.profile(id, Object.assign({ level: 'debug' }, meta));
    }
}
exports.profile = profile;
function logError(error) {
    logger.error(`${error.name} ${error.message}`);
    logger.debug(error);
}
exports.logError = logError;
function createFileLogger(filename) {
    const fileTransport = new winston.transports.File({ filename, level: 'debug' });
    return winston.createLogger({ transports: [createConsoleTransport(), fileTransport] });
}
exports.createFileLogger = createFileLogger;
exports.default = logger;
