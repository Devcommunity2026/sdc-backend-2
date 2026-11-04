/**
 * Standard API response envelope helpers
 */
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, statusCode = 500, message = 'An error occurred', data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};
