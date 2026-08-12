import logger from "../config/logger.js";
const errorHandler = (err, req, res, next) => {
    logger.error(err.logMessage, {
        message: err.errorMessage,
        stack: err.stack
    });
    return res.status(err.statusCode).json({
        success: false,
        message: err.responseMessage
    })
}

export default errorHandler