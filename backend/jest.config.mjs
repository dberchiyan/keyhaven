// @ts-check
/**
 * Integration tests against a real PostgreSQL (TEST_DATABASE_URL), migrated from scratch by the
 * global setup; external providers are replaced by fakes (quality.md → Tests).
 * @type {import('jest').Config}
 */
export default {
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.spec.ts'],
    transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
    // The generated Prisma client imports its own files with a `.js` extension (nodenext).
    moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
    globalSetup: '<rootDir>/test/global-setup.ts',
    setupFiles: ['<rootDir>/test/env.ts'],
    testTimeout: 30_000,
    // Tests share one database; running files in parallel would interleave their fixtures.
    maxWorkers: 1,
};
