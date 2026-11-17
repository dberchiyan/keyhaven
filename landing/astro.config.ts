import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

/**
 * The landing shares the app's origin: nginx serves it at `/` to visitors without a session and
 * the app everywhere else. Its own files live under `/_landing/`, apart from the app's `/assets/`.
 */
const SITE_URL = process.env.SITE_URL ?? 'https://keyhaven.osdb.io';

export default defineConfig({
    site: SITE_URL,
    output: 'static',
    trailingSlash: 'never',
    build: { assets: '_landing', format: 'file' },
    compressHTML: true,
    // The catalogue's photos are Unsplash pictures: fetched once at build, resized and re-encoded
    // by sharp into /_landing/, so the page loads no third-party image.
    image: {
        remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' }],
    },
    integrations: [sitemap({ filter: (page) => !page.endsWith('/404') })],
    vite: {
        plugins: [tailwindcss()],
        // Scripts always ship as files under /_landing/, never inlined into the HTML: the proxy's
        // CSP allows `script-src 'self'` and no inline script. Other assets keep Vite's default.
        build: { assetsInlineLimit: (file) => (file.endsWith('.js') ? false : undefined) },
    },
});
