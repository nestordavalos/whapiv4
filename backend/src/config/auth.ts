const isDevelopment = process.env.NODE_ENV !== "production";

const defaultSecret = "mysecret";
const defaultRefreshSecret = "myanothersecret";

const jwtSecret = process.env.JWT_SECRET || defaultSecret;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || defaultRefreshSecret;

// En producción, los secretos son obligatorios y no pueden ser los valores por defecto
if (!isDevelopment) {
  if (!process.env.JWT_SECRET || jwtSecret === defaultSecret) {
    throw new Error(
      "JWT_SECRET must be defined in environment variables and cannot be the default value in production. Generate a secure secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""  
    );
  }

  if (!process.env.JWT_REFRESH_SECRET || jwtRefreshSecret === defaultRefreshSecret) {
    throw new Error(
      "JWT_REFRESH_SECRET must be defined in environment variables and cannot be the default value in production. Generate a secure secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""  
    );
  }
}

// En desarrollo, advertir si se están usando valores por defecto
if (isDevelopment && (jwtSecret === defaultSecret || jwtRefreshSecret === defaultRefreshSecret)) {
  // eslint-disable-next-line no-console
  console.warn(
    "\x1b[33m%s\x1b[0m",
    "\n⚠️  WARNING: Using default JWT secrets in development.\n" +
    "   For production, generate secure secrets with:\n" +
    "   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"\n"
  );
}

export default {
  secret: jwtSecret,
  expiresIn: "8h",
  refreshSecret: jwtRefreshSecret,
  refreshExpiresIn: "1d"
};