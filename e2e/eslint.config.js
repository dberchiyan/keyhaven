// @ts-check
import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**', 'eslint.config.js'] },
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            globals: { ...globals.node },
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        plugins: { 'simple-import-sort': simpleImportSort },
        rules: {
            'simple-import-sort/imports': ['error', { groups: [['^\\u0000'], ['^node:', '^@?\\w'], ['^\\.']] }],
            'simple-import-sort/exports': 'error',
            'no-console': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            'no-restricted-syntax': [
                'error',
                { selector: 'TSEnumDeclaration', message: 'Use an `as const` object.' },
                { selector: 'ExportDefaultDeclaration', message: 'Named exports only (default only in *.config.*).' },
            ],
        },
    },
    { files: ['*.config.ts'], rules: { 'no-restricted-syntax': 'off' } },
    {
        files: ['global-setup.ts'],
        rules: {
            'no-restricted-syntax': ['error', { selector: 'TSEnumDeclaration', message: 'Use an `as const` object.' }],
        },
    },
);
