export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, message?: string, meta?: any): ApiResponse<T> {
  return {
    success: true,
    ...(message && { message }),
    data,
    ...(meta && { meta }),
  };
}

export function errorResponse(message: string, code = "INTERNAL_SERVER_ERROR", details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}
