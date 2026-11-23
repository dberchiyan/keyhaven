import type { APIRoute, GetStaticPaths } from 'astro';

import { type PageMeta, PAGES, shareSlugOf } from '@/content/pages';
import { renderShareImage } from '@/lib/og-image';

interface Props {
    page: PageMeta;
}

/** One share image per page, at `/og/<page>.png` (LD-5, LD-39). */
export const getStaticPaths = (() =>
    PAGES.map((page) => ({ params: { slug: shareSlugOf(page.path) }, props: { page } }))) satisfies GetStaticPaths;

/** Renders the page's share image at build; the PNG ships as a static file under `/og/`. */
export const GET: APIRoute<Props> = async ({ props }) => {
    const png = await renderShareImage(props.page);
    return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
