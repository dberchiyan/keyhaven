/**
 * Imported first by demo.spec.ts: the configuration is validated when the application module
 * loads, so the demo switch must be on before `./app` is imported (test/env.ts turns it off for
 * every other file).
 */
process.env.DEMO_MODE = 'true';
