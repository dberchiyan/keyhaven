import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { BrandMark } from '@/shared/components/BrandMark';
import { cn } from '@/shared/lib/cn';
import {
  type BrowseParams,
  parseBrowseParams,
  toBrowseSearchParams,
} from '@/shared/lib/listingSearch';
import { PATHS } from '@/shared/lib/paths';
import { UserMenu } from './UserMenu';

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
    <header className="sticky top-0 z-10 flex shrink-0 flex-col border-b border-divider bg-background-paper shadow-[0_1px_2px_var(--mui-palette-shadow-soft)]">
      <div className="mx-auto flex h-top-bar-height w-full max-w-page items-center gap-3 px-4 md:px-8">
        <Link
          to={PATHS.browse}
          aria-label={t('shell:site.home')}
          className="-ml-1 flex items-center gap-2.5 rounded-sm p-1 text-inherit no-underline"
        >
          <BrandMark className="size-9" />
          <Typography variant="h6" component="span" className="hidden sm:inline">
            {t('common:app.name')}
          </Typography>
        </Link>
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
      <nav
        aria-label={t('shell:site.catalogue')}
        className="mx-auto w-full max-w-page px-4 pb-3 md:hidden"
      >
        <Tabs activeTab={activeTab} params={params} fullWidth />
      </nav>
    </header>
  );
}

interface TabsProps {
  activeTab: Tab | null;
  params: BrowseParams;
  fullWidth?: boolean;
}

/** A segmented control of links: the same shape as the theme's toggle groups. */
function Tabs({ activeTab, params, fullWidth = false }: TabsProps) {
  const { t } = useTranslation('shell');
  return (
    <ul
      className={cn(
        'bg-background-default m-0 flex list-none gap-0.5 rounded-full border border-divider p-0.5',
        fullWidth && 'w-full',
      )}
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <li key={tab} className={cn('flex', fullWidth && 'flex-1')}>
            <Link
              to={tabTarget(params, tab)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-9 flex-1 items-center justify-center rounded-full px-4 no-underline transition-colors hover:text-text-primary',
                isActive
                  ? 'bg-background-paper text-text-primary shadow-[0_1px_2px_var(--mui-palette-shadow-soft)]'
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
