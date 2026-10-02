import { Elysia } from "elysia";
import { HttpException } from "../exceptions";
import { errorResponse } from "../utils/response";
import { Prisma } from "@prisma/client";

export const errorMiddleware = new Elysia({ name: "error-middleware" })
  .onError({ as: "global" }, ({ code, error, set }) => {
    // 1. Domain HttpExceptions or errors with statusCode
    if (error instanceof HttpException || (error as any)?.statusCode) {
      const statusCode = (error as any).statusCode || 500;
      const errorCode = (error as any).code || "INTERNAL_SERVER_ERROR";
      const details = (error as any).details;
      const message = (error as any).message || "An error occurred";
      set.status = statusCode;
      return errorResponse(message, errorCode, details);
    }

    // 2. Elysia Validation Errors
    if (code === "VALIDATION") {
      set.status = 422;
      return errorResponse(
        "Validation failed for request parameters or body",
        "VALIDATION_ERROR",
        (error as any)?.all ?? (error as any)?.validator?.Errors?.(error as any)?.map((e: any) => ({
          path: e.path,
          message: e.message,
        }))
      );
    }

    // 3. Prisma Known Request Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        set.status = 409;
        const target = (error.meta?.target as string[])?.join(", ") || "field";
        return errorResponse(`A record with this ${target} already exists`, "DUPLICATE_ENTRY");
      }
      if (error.code === "P2025") {
        set.status = 404;
        return errorResponse("Record not found", "NOT_FOUND");
      }
      if (error.code === "P2003") {
        set.status = 400;
        return errorResponse("Foreign key constraint violation", "FOREIGN_KEY_VIOLATION");
      }
      set.status = 400;
      return errorResponse(error.message, "DATABASE_ERROR");
    }

    // 4. Elysia Route Not Found
    if (code === "NOT_FOUND") {
      set.status = 404;
      return errorResponse("Endpoint not found", "ROUTE_NOT_FOUND");
    }

    // 5. Default Internal Server Error
    console.error("💥 Unhandled Error:", error);
    set.status = 500;
    return errorResponse(
      process.env.NODE_ENV === "production" ? "Internal server error" : (error as Error)?.message || "Unknown error",
      "INTERNAL_SERVER_ERROR"
    );
  });
