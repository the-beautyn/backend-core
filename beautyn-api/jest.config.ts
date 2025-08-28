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
