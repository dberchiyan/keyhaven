// @ts-check
/** @type {import('jest').Config} */
export default {
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.spec.ts'],
    transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^(\\.{1,2}/.*)\\.js$': '$1' },
    globalSetup: '<rootDir>/test/global-setup.ts',
    setupFiles: ['<rootDir>/test/env.ts'],
    testTimeout: 30_000,
    maxWorkers: 1,
};
