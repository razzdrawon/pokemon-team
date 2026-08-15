import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@pokemon/contracts';
import { AppException } from './app-exception.js';

// Minimal shape for what we use — no @types/express installed, and the full type isn't needed.
interface HttpResponseLike {
  status(code: number): { json(body: unknown): void };
}
interface HttpRequestLike {
  url: string;
}

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponseLike>();
    const request = ctx.getRequest<HttpRequestLike>();

    const body: ApiErrorBody = {
      ...this.resolve(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(body.statusCode).json(body);
  }

  private resolve(exception: unknown): Omit<ApiErrorBody, 'path' | 'timestamp'> {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      };
    }
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      // 400 = framework-level validation failure (e.g. malformed JSON); else no domain code fits.
      const code: ApiErrorCode = statusCode === 400 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR';
      return { statusCode, code, message: exception.message };
    }
    console.error(exception);
    return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
  }
}
