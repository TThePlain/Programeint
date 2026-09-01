import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === "string") {
        res.status(status).json({ message: payload });
        return;
      }
      const record = payload as Record<string, unknown>;
      const message =
        typeof record.message === "string"
          ? record.message
          : Array.isArray(record.message)
            ? String(record.message[0])
            : "Pedido recusado.";
      res.status(status).json({
        message,
        code: typeof record.code === "string" ? record.code : undefined,
      });
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Erro interno. O pedido foi registado.",
    });
  }
}
