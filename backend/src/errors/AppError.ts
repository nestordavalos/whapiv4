class AppError extends Error {
  public readonly statusCode: number;

  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 400,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.name = "AppError";
    // Capture proper stack trace (excludes constructor from trace)
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
