import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    { ignores: ['dist/', '.astro/', 'node_modules/'] },
    js.configs.recommended,
    tseslint.configs.strict,
    astro.configs.recommended,
    astro.configs['jsx-a11y-strict'],
    {
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        plugins: { 'simple-import-sort': simpleImportSort },
        rules: {
            'no-console': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/no-magic-numbers': [
                'error',
                {
                    ignore: [-1, 0, 1, 2],
                    ignoreEnums: true,
                    ignoreNumericLiteralTypes: true,
                    ignoreReadonlyClassProperties: true,
                    ignoreTypeIndexes: true,
                    enforceConst: true,
                },
            ],
            'simple-import-sort/imports': [
                'error',
                { groups: [['^\\u0000'], ['^node:', '^@?\\w'], ['^@/'], ['^\\.']] },
            ],
            'simple-import-sort/exports': 'error',
            'no-restricted-syntax': [
                'error',
                { selector: 'TSEnumDeclaration', message: 'Use an `as const` object.' },
                { selector: "CallExpression[callee.property.name='then']", message: 'Use async/await, not .then().' },
            ],
        },
    },
    {
        files: ['**/*.ts'],
        ignores: ['*.config.*'],
        rules: {
            'no-restricted-syntax': [
                'error',
                { selector: 'TSEnumDeclaration', message: 'Use an `as const` object.' },
                { selector: "CallExpression[callee.property.name='then']", message: 'Use async/await, not .then().' },
                { selector: 'ExportDefaultDeclaration', message: 'Named exports only (default only in *.config.*).' },
            ],
        },
    },
    {
        files: ['src/content/**', 'src/components/mock/**', 'scripts/**', '*.config.*'],
        rules: { '@typescript-eslint/no-magic-numbers': 'off' },
    },
);
