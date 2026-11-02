export class HttpError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code || HttpError.defaultCodeForStatus(statusCode);
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  private static defaultCodeForStatus(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMITED';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'INTERNAL_SERVER_ERROR';
    }
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details?: any) {
    return new HttpError(400, message, code, details);
  }

  static unauthorized(message = 'Invalid email or password', code = 'UNAUTHORIZED') {
    return new HttpError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new HttpError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new HttpError(404, message, code);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT') {
    return new HttpError(409, message, code);
  }

  static unprocessable(message = 'Validation failed', code = 'VALIDATION_ERROR', details?: any) {
    return new HttpError(422, message, code, details);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', code = 'RATE_LIMITED') {
    return new HttpError(429, message, code);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new HttpError(503, message, code);
  }
}
