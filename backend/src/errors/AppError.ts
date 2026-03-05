class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
    // Capture proper stack trace (excludes constructor from trace)
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
