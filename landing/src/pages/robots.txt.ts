import type { APIRoute } from 'astro';

import { AI_CRAWLERS, CANONICAL_URL } from '@/content/site';

const RULES = 'Allow: /\nDisallow: /api/';

/**
 * AI crawlers are allowed by name, a recorded choice (LD-40): the demo is public and wants to be
 * found. A build for another host (a preview, staging) disallows everything.
 */
export const GET: APIRoute = ({ site }) => {
    const origin = site ?? new URL(CANONICAL_URL);
    if (origin.origin !== new URL(CANONICAL_URL).origin) {
        return new Response('User-agent: *\nDisallow: /\n', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
    const groups = ['*', ...AI_CRAWLERS].map((agent) => `User-agent: ${agent}\n${RULES}`).join('\n\n');
    const sitemap = new URL('/sitemap-index.xml', origin).href;
    return new Response(`${groups}\n\nSitemap: ${sitemap}\n`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
};
