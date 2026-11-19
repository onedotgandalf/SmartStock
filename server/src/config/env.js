// Reads settings from the .env file and stops the app early,
// with a clear message, if something important is missing.
import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`\n❌ Missing ${name} in server/.env. Copy .env.example to .env and fill it in.\n`);
    process.exit(1);
  }
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32 || jwtSecret.startsWith("replace_this")) {
  console.error("\n❌ JWT_SECRET must be your own random value of at least 32 characters.\n");
  process.exit(1);
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  timezone: process.env.APP_TIMEZONE || "Asia/Bangkok",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  isProduction: process.env.NODE_ENV === "production"
};
