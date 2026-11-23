import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { PAGES } from './src/content/pages';
import { CANONICAL_URL } from './src/content/site';

/** Vite inlines small scripts into the HTML; the proxy's CSP allows script files only (LD-44), so scripts stay files. */
const keepScriptsAsFiles = (file: string): false | undefined => (file.endsWith('.js') ? false : undefined);

/** The sitemap's `lastmod` is the content date of each page (LD-40): the snapshot day or the copy's update. */
const lastModifiedOn = (url: string): string =>
    PAGES.find((page) => page.path === (new URL(url).pathname.replace(/\/$/, '') || '/'))?.updatedOn ?? '';

export default defineConfig({
    site: process.env.SITE_URL ?? CANONICAL_URL,
    output: 'static',
    trailingSlash: 'never',
    build: { format: 'file', assets: '_landing', inlineStylesheets: 'never' },
    compressHTML: true,
    image: {
        remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' }],
    },
    integrations: [
        sitemap({
            filter: (page) => PAGES.some((meta) => meta.isIndexed && new URL(page).pathname === meta.path),
            serialize: (item) => ({ ...item, lastmod: lastModifiedOn(item.url) }),
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
        build: { assetsInlineLimit: keepScriptsAsFiles },
    },
});
