import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message);
  res.status(500).json({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Error interno del servidor',
    },
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint no encontrado',
    },
  });
}
