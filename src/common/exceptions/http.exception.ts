export class HttpException extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundException extends HttpException {
  constructor(message = "Resource not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class BadRequestException extends HttpException {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = "Unauthorized access", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = "Forbidden resource", details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class ConflictException extends HttpException {
  constructor(message = "Resource already exists", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(message = "Unprocessable entity", details?: unknown) {
    super(message, 422, "UNPROCESSABLE_ENTITY", details);
  }
}
