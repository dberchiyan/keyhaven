import { INDEX_PATH, NOT_FOUND_PATH, type PageMeta } from '@/content/pages';

export interface BreadcrumbList {
    '@type': 'BreadcrumbList';
    itemListElement: { '@type': 'ListItem'; position: number; name: string; item: string }[];
}

/** Nested pages carry a BreadcrumbList (LD-39): home, then the page itself; `/` and the 404 page carry none. */
export const breadcrumbsOf = (page: PageMeta, site: URL, homeName: string): BreadcrumbList | undefined => {
    if (page.path === INDEX_PATH || page.path === NOT_FOUND_PATH) {
        return undefined;
    }
    const trail = [
        { name: homeName, path: INDEX_PATH },
        { name: page.shareHeading, path: page.path },
    ];
    return {
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((step, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: step.name,
            item: new URL(step.path, site).href,
        })),
    };
};
