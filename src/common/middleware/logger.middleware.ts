import { Elysia } from "elysia";

export const loggerMiddleware = new Elysia({ name: "logger-middleware" })
  .onRequest(({ request }) => {
    (request as unknown as { _startTime: number })._startTime = performance.now();
  })
  .onAfterResponse(({ request, set }) => {
    const startTime = (request as unknown as { _startTime: number })._startTime || performance.now();
    const duration = (performance.now() - startTime).toFixed(2);
    const method = request.method;
    const url = new URL(request.url).pathname;

    let statusCode = 200;
    if (typeof set.status === "number") {
      statusCode = set.status;
    } else if (typeof set.status === "string" && !isNaN(parseInt(set.status, 10))) {
      statusCode = parseInt(set.status, 10);
    }

    const statusColor =
      statusCode >= 500 ? "\x1b[31m" : statusCode >= 400 ? "\x1b[33m" : statusCode >= 300 ? "\x1b[36m" : "\x1b[32m";
    const reset = "\x1b[0m";

    console.log(`[HTTP] ${method} ${url} -> ${statusColor}${statusCode}${reset} (${duration}ms)`);
  });
