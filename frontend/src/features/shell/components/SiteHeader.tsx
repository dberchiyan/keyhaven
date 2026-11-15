import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { useUnreadMessages } from '@/features/message';
import { BrandMark } from '@/shared/components/BrandMark';
import { cn } from '@/shared/lib/cn';
import {
  type BrowseParams,
  parseBrowseParams,
  toBrowseSearchParams,
} from '@/shared/lib/listingSearch';
import { PATHS } from '@/shared/lib/paths';
import { UserMenu } from './UserMenu';

const BRAND_CLASS = '-ml-1 flex items-center gap-2.5 rounded-sm p-1 text-inherit no-underline';

type Tab = 'rent' | 'sale' | 'houses';
const TABS: readonly Tab[] = ['rent', 'sale', 'houses'];

/**
 * The tabs keep the visitor's search (city, text) and drop what does not carry over: the price
 * range (rents and asking prices differ by a hundredfold) and, between Rent and Buy, the type.
 */
const tabTarget = (params: BrowseParams, tab: Tab): string => {
  const next: BrowseParams =
    tab === 'houses'
      ? { ...params, type: 'HOUSE', page: 1 }
      : {
          ...params,
          kind: tab,
          type: undefined,
          priceMin: undefined,
          priceMax: undefined,
          availableBy: tab === 'sale' ? undefined : params.availableBy,
          pets: tab === 'sale' ? undefined : params.pets,
          furnished: tab === 'sale' ? undefined : params.furnished,
          page: 1,
        };
  const search = toBrowseSearchParams(next).toString();
  return search ? `${PATHS.browse}?${search}` : PATHS.browse;
};

/**
 * The public site's header: the brand, the catalogue tabs (Rent, Buy, Houses) and, on the right,
 * sign-in and "List your home" for a visitor or the account menu for a signed-in person.
 */
export function SiteHeader() {
  const { t } = useTranslation(['shell', 'common']);
  const { data: user } = useCurrentUser();
  const can = useAccess();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  // On the catalogue the tabs carry the current search along; elsewhere they start a fresh one.
  const params = parseBrowseParams(
    pathname === PATHS.browse ? searchParams : new URLSearchParams(),
  );
  const activeTab: Tab | null =
    pathname === PATHS.browse ? (params.type === 'HOUSE' ? 'houses' : params.kind) : null;

  return (
    // z-20: above the cards' hearts (z-10, raised over their stretched link), which otherwise
    // show through the sticky bar while the grid scrolls under it.
    <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-divider bg-background-paper px-4 shadow-[0_1px_2px_var(--mui-palette-shadow-soft)] md:px-8">
      {/* Gutters on the header, the column inside — the same box as <main>, so the brand and the
          actions line up with the page's content. */}
      <div className="mx-auto flex h-top-bar-height w-full max-w-page items-center gap-3">
        {/* The brand goes "home", and home depends on who is here: the landing page for a visitor
            (a full navigation — nginx serves it at `/` when there is no session), the catalogue
            for a tenant, the dashboard for someone who lists. */}
        {user ? (
          <Link
            to={can('home.manage') ? PATHS.home : PATHS.browse}
            aria-label={t('shell:site.home')}
            className={BRAND_CLASS}
          >
            <BrandMark className="size-9" />
            <Typography variant="h6" component="span">
              {t('common:app.name')}
            </Typography>
          </Link>
        ) : (
          <a href={PATHS.home} aria-label={t('shell:site.landing')} className={BRAND_CLASS}>
            <BrandMark className="size-9" />
            <Typography variant="h6" component="span">
              {t('common:app.name')}
            </Typography>
          </a>
        )}
        <nav aria-label={t('shell:site.catalogue')} className="hidden md:block">
          <Tabs activeTab={activeTab} params={params} />
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              {can('section.saved') && (
                <Button component={NavLink} to={PATHS.saved} variant="text">
                  {t('shell:site.saved')}
                </Button>
              )}
              {can('viewing.book') && (
                <Button
                  component={NavLink}
                  to={PATHS.viewings}
                  variant="text"
                  className="hidden sm:inline-flex"
                >
                  {t('shell:site.viewings')}
                </Button>
              )}
              {can('viewing.book') && <MessagesLink />}
              {can('home.manage') && (
                <Button component={Link} to={PATHS.home} variant="text">
                  {t('shell:site.dashboard')}
                </Button>
              )}
              <UserMenu />
            </>
          ) : (
            <>
              <Button component={Link} to={PATHS.login} variant="text">
                {t('shell:site.signIn')}
              </Button>
              <Button
                component={Link}
                to={`${PATHS.signup}?role=landlord`}
                variant="contained"
                className="hidden sm:inline-flex"
              >
                {t('shell:site.listHome')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** The tenant's way to the inbox, with the unread count (listers have it in the sidebar). */
function MessagesLink() {
  const { t } = useTranslation('shell');
  const unread = useUnreadMessages();
  const count = unread.data?.unread ?? 0;
  return (
    <Button
      component={NavLink}
      to={PATHS.messages}
      variant="text"
      aria-label={count > 0 ? t('site.messagesUnread', { count }) : undefined}
      className="hidden sm:inline-flex"
    >
      <Badge badgeContent={count} color="secondary" max={99} className="pr-1">
        {t('site.messages')}
      </Badge>
    </Button>
  );
}

interface TabsProps {
  activeTab: Tab | null;
  params: BrowseParams;
}

/** A segmented control of links: the same shape as the theme's toggle groups. */
function Tabs({ activeTab, params }: TabsProps) {
  const { t } = useTranslation('shell');
  return (
    <ul className="bg-background-default m-0 flex list-none gap-0.5 rounded-full border border-divider p-0.5">
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <li key={tab} className="flex">
            <Link
              to={tabTarget(params, tab)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-9 flex-1 items-center justify-center rounded-full px-4 no-underline transition-colors hover:text-text-primary',
                // A solid forest pill, as the sidebar's active item: a paper pill on the paper
                // header's cream track was hard to tell from its neighbours.
                isActive
                  ? 'bg-primary text-primary-contrast-text hover:text-primary-contrast-text'
                  : 'text-text-secondary',
              )}
            >
              <Typography variant="subtitle2" component="span">
                {t(`site.tabs.${tab}`)}
              </Typography>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
