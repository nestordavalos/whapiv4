declare namespace Express {
  export interface Request {
    user: { id: string; profile: string };
    /** Unique request identifier (set by requestId middleware) */
    id: string;
  }
}
