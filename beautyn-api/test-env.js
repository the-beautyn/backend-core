// Test environment setup
// This file is loaded by Jest before running tests
const { config } = require('dotenv');
const path = require('path');

// Load env from project root
config({ path: path.join(__dirname, '.env') });
config({ path: path.join(__dirname, '.env.test') });

// Force local DB for tests regardless of host env to avoid accidental prod connections
process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';
process.env.DIRECT_URL = process.env.DIRECT_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

// Set other test environment variables if not already set

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