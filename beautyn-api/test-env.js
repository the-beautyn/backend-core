// Test environment setup
// This file is loaded by Jest before running tests

// Ensure DATABASE_URL is set for tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./test.db?connection_limit=1&mode=memory";
}

// Set other test environment variables if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
}

if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = "1h";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = "error";
}

if (!process.env.SWAGGER_ENABLED) {
  process.env.SWAGGER_ENABLED = "false";
}

// Supabase test environment variables
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = "http://127.0.0.1:54321";
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
}

if (!process.env.APP_URL) {
  process.env.APP_URL = "http://localhost:3000";
} 