import type { JestConfigWithTsJest } from 'ts-jest';
import { config as dotenvConfig } from 'dotenv';

// Load test environment variables
dotenvConfig({ path: '.env.test' });

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  moduleNameMapper: {
    '^@crm/shared$': '<rootDir>/libs/crm/shared/src',
    '^@crm/shared/(.*)$': '<rootDir>/libs/crm/shared/src/$1',
    '^@crm/capability-registry$': '<rootDir>/libs/crm/capability-registry/src',
    '^@crm/capability-registry/(.*)$': '<rootDir>/libs/crm/capability-registry/src/$1',
    '^@crm/retry-handler$': '<rootDir>/libs/crm/retry-handler/src',
    '^@crm/retry-handler/(.*)$': '<rootDir>/libs/crm/retry-handler/src/$1',
    '^@crm/token-storage$': '<rootDir>/libs/crm/token-storage/src',
    '^@crm/token-storage/(.*)$': '<rootDir>/libs/crm/token-storage/src/$1',
    '^@crm/account-registry$': '<rootDir>/libs/crm/account-registry/src',
    '^@crm/account-registry/(.*)$': '<rootDir>/libs/crm/account-registry/src/$1',
    '^@crm/provider-core$': '<rootDir>/libs/crm/provider-core/src',
    '^@crm/provider-core/(.*)$': '<rootDir>/libs/crm/provider-core/src/$1',
    '^@crm/adapter$': '<rootDir>/libs/crm/adapter/src',
    '^@crm/adapter/(.*)$': '<rootDir>/libs/crm/adapter/src/$1',
    '^@crm/sync-scheduler$': '<rootDir>/libs/crm/sync-scheduler/src',
    '^@crm/sync-scheduler/(.*)$': '<rootDir>/libs/crm/sync-scheduler/src/$1',
    '^@shared/logger$': '<rootDir>/libs/shared/logger/src',
    '^@shared/logger/(.*)$': '<rootDir>/libs/shared/logger/src/$1',
  },
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  setupFilesAfterEnv: ['<rootDir>/test-env.js'],
  testPathIgnorePatterns: ['<rootDir>/test/e2e/'],
  testTimeout: 20000,
};

export default config;
