import logger from "../config/logger.js";

const errorHandler = (err, req, res, next) => {
    const statusCode = Number(err.statusCode) || 500;
    const logMessage = err.logMessage || err.message || "Unhandled server error";
    const responseMessage = err.responseMessage || err.message || "An unexpected error occurred. Please try again.";

    logger.error(logMessage, {
        message: err.errorMessage || err.message,
        stack: err.stack
    });

    return res.status(statusCode).json({
        success: false,
        message: responseMessage
    });
};

export default errorHandler;
