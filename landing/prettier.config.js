export default {
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 120,
    tabWidth: 4,
    plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
    tailwindStylesheet: './src/styles/global.css',
    overrides: [
        { files: '*.astro', options: { parser: 'astro' } },
        { files: ['*.yml', '*.yaml'], options: { tabWidth: 2 } },
    ],
};
