/**
 * Checks the built site (LD-52): every page's title and description present, unique and within
 * length; no internal link to a page that does not exist; no orphan page; no inline style, no
 * inline script, no long dash, no email address (LD-14, LD-45, LD-8). Exits 1 on any finding.
 *
 *   npm run build             # astro check, astro build, then this script
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { APP_ROUTE_PREFIXES, DEMO } from '../src/content/site.ts';

const DIST = join(import.meta.dirname, '../dist');
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;
const UNLINKED_PAGES = new Set(['/', '/404']);
const DATA_SCRIPT = /^<script type="application\/ld\+json"/;
const DEMO_EMAILS = new Set<string>(DEMO.accounts.map((account) => account.email));

const listFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });

const routeOf = (file: string): string => {
    const route = `/${relative(DIST, file).replace(/\.html$/, '')}`;
    return route === '/index' ? '/' : route;
};

const decode = (text: string): string =>
    text
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

const visibleText = (html: string): string =>
    html
        .replace(/<script[\s\S]*?<\/script>/g, ' ')
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        .replace(/<[^>]+>/g, ' ');

const files = listFiles(DIST);
const existing = new Set(files.map((file) => `/${relative(DIST, file)}`));
const pages = files
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({ route: routeOf(file), html: readFileSync(file, 'utf8') }));
const findings: string[] = [];
const titles = new Map<string, string>();
const linkedRoutes = new Set<string>();

const resolves = (target: string): boolean =>
    APP_ROUTE_PREFIXES.some((prefix) => target.startsWith(prefix)) ||
    existing.has(target) ||
    existing.has(`${target}.html`) ||
    (target === '/' && existing.has('/index.html'));

for (const { route, html } of pages) {
    const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
    const description = decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '');
    if (!title || title.length > TITLE_MAX) {
        findings.push(`${route}: title "${title}" is missing or over ${TITLE_MAX} characters`);
    }
    if (!description || description.length > DESCRIPTION_MAX) {
        findings.push(`${route}: description is missing or over ${DESCRIPTION_MAX} characters (${description.length})`);
    }
    const sameTitle = titles.get(title);
    if (sameTitle) {
        findings.push(`${route}: title duplicates ${sameTitle}`);
    }
    titles.set(title, route);
    if (/\sstyle=/.test(html) || /<style[\s>]/.test(html)) {
        findings.push(`${route}: inline style (LD-45)`);
    }
    for (const script of html.match(/<script\b[^>]*>/g) ?? []) {
        if (!/\ssrc=/.test(script) && !DATA_SCRIPT.test(script)) {
            findings.push(`${route}: inline script ${script}`);
        }
    }
    const text = visibleText(html);
    if (/[—–]/.test(text)) {
        findings.push(`${route}: a long dash in the copy (LD-8)`);
    }
    const emails = (html.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []).filter((email) => !DEMO_EMAILS.has(email));
    if (html.includes('mailto:') || emails.length > 0) {
        findings.push(`${route}: an email address in the markup (LD-14) ${emails.join(', ')}`);
    }
    for (const [, href = ''] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
        if (!href.startsWith('/') || href.startsWith('//')) {
            continue;
        }
        const target = decode(href).split(/[?#]/)[0] ?? '';
        if (!resolves(target)) {
            findings.push(`${route}: broken link ${href}`);
        }
        if (target !== route) {
            linkedRoutes.add(target);
        }
    }
}

for (const { route } of pages) {
    if (!UNLINKED_PAGES.has(route) && !linkedRoutes.has(route)) {
        findings.push(`${route}: orphan page, nothing links to it`);
    }
}

if (findings.length > 0) {
    process.stderr.write(`Build check failed:\n${findings.map((finding) => `  ${finding}`).join('\n')}\n`);
    process.exit(1);
}
process.stdout.write(`Build check: ${pages.length} pages, titles, links and markup clean.\n`);
