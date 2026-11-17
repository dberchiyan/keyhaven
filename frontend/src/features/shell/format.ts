import { PATHS } from '@/shared/lib/paths';

/**
 * The view-transition key of a page (MOT-4): Settings' sections share one key because they are one
 * page with its own menu, so switching sections does not replay the page transition.
 */
export const pageTransitionKey = (pathname: string): string =>
    pathname.startsWith(`${PATHS.settings}/`) ? PATHS.settings : pathname;
