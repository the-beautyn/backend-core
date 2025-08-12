import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

export const TEST_CONFIG = {
  // Test database URL - use SQLite in-memory for faster tests
  DATABASE_URL: process.env.DATABASE_URL || "file:./test.db?connection_limit=1&mode=memory",
  
  // JWT secret for testing
  JWT_SECRET: process.env.JWT_SECRET || "test-secret-key-for-testing-only",
  
  // JWT expiration for testing
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  
  // Node environment
  NODE_ENV: process.env.NODE_ENV || "test",
  
  // Test timeout
  TEST_TIMEOUT: parseInt(process.env.TEST_TIMEOUT || "10000"),
  
  // Log level for tests
  LOG_LEVEL: process.env.LOG_LEVEL || "error",
  
  // Swagger enabled for tests
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED === "true",
};

export const setupTestEnvironment = () => {
  // Set test environment variables from .env.test
  // Only set DATABASE_URL if not already set (allows tests to override)
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL;
  }
  process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
  process.env.JWT_EXPIRES_IN = TEST_CONFIG.JWT_EXPIRES_IN;
  process.env.NODE_ENV = TEST_CONFIG.NODE_ENV;
  process.env.LOG_LEVEL = TEST_CONFIG.LOG_LEVEL;
  process.env.SWAGGER_ENABLED = TEST_CONFIG.SWAGGER_ENABLED.toString();
}; 