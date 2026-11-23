// @ts-check
import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const crossModuleInternals = ['repository', 'controller'].flatMap((layer) => [
    `@/modules/*/${layer}/**`,
    `@/modules/*/*/${layer}/**`,
]);
const crossModuleRelative = String.raw`^(?:\.\./)+(?!\.\.)[\w-]+/(?:[\w-]+/)?(?:repository|controller)/`;
const prismaClient = ['**/generated/prisma/**', '@prisma/client', '@prisma/client/**'];
const baseSyntax = [
    { selector: 'TSEnumDeclaration', message: 'Use an `as const` object.' },
    { selector: 'ExportDefaultDeclaration', message: 'Named exports only.' },
    { selector: "CallExpression[callee.name='eval']", message: 'Forbidden (SEC-17).' },
];
const clockMessage = 'Take the time from Clock (`this.clock.now()`) and pass `now` down (CORE-26).';
const clockSyntax = [
    { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: clockMessage },
    { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: clockMessage },
];
const crossModuleMessage = 'Use the other module’s exported service.';
const crossModulePattern = { group: crossModuleInternals, message: crossModuleMessage };
const crossModuleRelativePattern = { regex: crossModuleRelative, message: crossModuleMessage };
const childProcessPattern = { group: ['child_process', 'node:child_process'], message: 'Forbidden (SEC-17).' };
const basePatterns = [crossModulePattern, crossModuleRelativePattern, childProcessPattern];
const prismaPattern = { group: prismaClient, message: 'Prisma is used only in repositories and common/persistence.' };
const principalImport = {
    group: ['@/common/security/principal', '**/security/principal'],
    message:
        'Services and repositories take an Actor (`toActor(principal)` in the controller), never the Principal (CORE-25).',
};

export default tseslint.config(
    {
        ignores: ['dist/**', 'src/generated/**', 'node_modules/**', 'eslint.config.mjs'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            globals: { ...globals.node },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
            },
        },
        plugins: { 'simple-import-sort': simpleImportSort },
        rules: {
            'simple-import-sort/imports': [
                'error',
                { groups: [['^\\u0000'], ['^node:', '^@?\\w'], ['^@/'], ['^\\.']] },
            ],
            'simple-import-sort/exports': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/no-magic-numbers': [
                'error',
                {
                    ignore: [-1, 0, 1, 2],
                    ignoreEnums: true,
                    ignoreNumericLiteralTypes: true,
                    ignoreReadonlyClassProperties: true,
                    ignoreTypeIndexes: true,
                    ignoreDefaultValues: false,
                    enforceConst: true,
                    detectObjects: true,
                },
            ],
            'max-depth': ['error', 3],
            'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
            'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
            'no-else-return': ['error', { allowElseIf: false }],
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-console': 'error',
            'no-empty': ['error', { allowEmptyCatch: true }],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            'no-restricted-syntax': ['error', ...baseSyntax],
            'no-restricted-imports': ['error', { patterns: [...basePatterns, prismaPattern] }],
        },
    },
    {
        files: [
            'src/modules/**/repository/**/*.ts',
            'src/common/persistence/**/*.ts',
            'src/common/security/permission.service.ts',
            'prisma/**/*.ts',
        ],
        rules: {
            'no-restricted-imports': ['error', { patterns: basePatterns }],
        },
    },
    {
        files: ['src/modules/**/service/**/*.ts'],
        rules: {
            'no-restricted-syntax': ['error', ...baseSyntax, ...clockSyntax],
            'no-restricted-imports': ['error', { patterns: [...basePatterns, prismaPattern, principalImport] }],
        },
    },
    {
        files: ['src/modules/**/repository/**/*.ts'],
        rules: {
            'no-restricted-syntax': ['error', ...baseSyntax, ...clockSyntax],
            'no-restricted-imports': ['error', { patterns: [...basePatterns, principalImport] }],
        },
    },
    {
        files: ['src/modules/**/controller/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        ...basePatterns,
                        { group: ['**/repository/**'], message: 'Controllers never touch repositories.' },
                        { group: prismaClient, message: 'Controllers never touch Prisma types.' },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/modules/**/controller/mapper/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        ...basePatterns,
                        {
                            regex: '/repository/(?!record/)',
                            message: 'Mappers may import only record types from the repository.',
                        },
                        { group: prismaClient, message: 'Controllers never touch Prisma types.' },
                    ],
                },
            ],
        },
    },
    {
        files: ['prisma/**/*.ts', 'scripts/**/*.ts', 'prisma.config.ts'],
        rules: { '@typescript-eslint/no-magic-numbers': 'off' },
    },
);
