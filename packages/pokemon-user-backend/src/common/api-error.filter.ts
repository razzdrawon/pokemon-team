import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { ApiErrorBody } from '@pokemon/contracts';
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
    // Framework errors outside our 5 documented endpoints (e.g. an unmatched route) —
    // keep the real status; none of our domain codes fit, so INTERNAL_ERROR is a stand-in.
    if (exception instanceof HttpException) {
      return { statusCode: exception.getStatus(), code: 'INTERNAL_ERROR', message: exception.message };
    }
    console.error(exception);
    return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
  }
}
