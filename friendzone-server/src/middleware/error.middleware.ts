import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.utils.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.config.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode,
        message: err.message,
      },
      'Operational HTTP Error'
    );

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  // Unexpected Internal Server Errors
  logger.error(
    {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack,
    },
    '🔥 Unhandled Internal Server Error'
  );

  return res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      statusCode: 500,
    },
  });
}
