import GitHub from '@mui/icons-material/GitHub';
import MailOutlined from '@mui/icons-material/MailOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { BrandMark } from '@/shared/components/BrandMark';
import { useCities } from '@/features/listing';
import { browseSearch } from '@/shared/lib/listingSearch';
import { PATHS, settingsPath } from '@/shared/lib/paths';

/** Where the code and the docs live (a public demo; the repository is the "about" page). */
const GITHUB_URL = 'https://github.com/dberchiyan/keyhaven';
const README_URL = `${GITHUB_URL}#readme`;
const CONTACT_EMAIL = 'hello@keyhaven.example';

type ColumnKey = 'browse' | 'cities' | 'account';
type LinkKey =
  | 'rent'
  | 'buy'
  | 'houses'
  | 'saved'
  | 'settings'
  | 'dashboard'
  | 'signIn'
  | 'listHome'
  | 'readme'
  | 'github';
type CircleKey = 'github' | 'readme' | 'email';

interface FooterLink {
  key: string;
  label: string;
  to: string;
  external?: boolean;
}

const linkClass =
  'inline-flex min-h-9 items-center text-footer-text no-underline transition-colors hover:text-footer-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-text';

/**
 * The public site's footer, the same as the landing's: a deep forest band with the brand block
 * (mark, name, a line about the site, three round icon links), three titled columns — Browse,
 * Cities, Account (which changes with the session) — then the fine print and a sign-in nudge.
 */
export function SiteFooter() {
  const { t } = useTranslation(['shell', 'common']);
  const { data: user } = useCurrentUser();
  const { data: cities } = useCities();
  const can = useAccess();
  const year = new Date().getUTCFullYear();
  const link = (key: LinkKey, to: string): FooterLink => ({
    key,
    label: t(`shell:footer.links.${key}`),
    to,
  });
  const columns: { key: ColumnKey; links: FooterLink[] }[] = [
    {
      key: 'browse',
      links: [
        link('rent', `${PATHS.browse}?${browseSearch({ kind: 'rent' })}`),
        link('buy', `${PATHS.browse}?${browseSearch({ kind: 'sale' })}`),
        link('houses', `${PATHS.browse}?${browseSearch({ kind: 'rent', type: 'HOUSE' })}`),
        ...(user && can('section.saved') ? [link('saved', PATHS.saved)] : []),
      ],
    },
    {
      key: 'cities',
      links: (cities ?? []).map((city) => ({
        key: city.slug,
        label: `${city.name}, ${city.state}`,
        to: `${PATHS.browse}?${browseSearch({ kind: 'rent', city: city.slug })}`,
      })),
    },
    {
      key: 'account',
      links: [
        ...(user
          ? [
              link('settings', settingsPath('account')),
              ...(can('home.manage') ? [link('dashboard', PATHS.home)] : []),
            ]
          : [link('signIn', PATHS.login), link('listHome', `${PATHS.signup}?role=landlord`)]),
        { ...link('readme', README_URL), external: true },
        { ...link('github', GITHUB_URL), external: true },
      ],
    },
  ];
  const circles: { key: CircleKey; href: string; icon: ReactNode }[] = [
    { key: 'github', href: GITHUB_URL, icon: <GitHub fontSize="small" /> },
    { key: 'readme', href: README_URL, icon: <MenuBookOutlined fontSize="small" /> },
    { key: 'email', href: `mailto:${CONTACT_EMAIL}`, icon: <MailOutlined fontSize="small" /> },
  ];

  return (
    <footer className="mt-10 bg-footer-background px-4 text-footer-text md:px-8">
      <div className="mx-auto flex w-full max-w-page flex-col gap-12 pt-14 pb-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] md:gap-8">
          <div className="col-span-2 flex max-w-sm flex-col gap-5 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <BrandMark className="size-9" />
              <Typography variant="h6" component="p">
                {t('common:app.name')}
              </Typography>
            </div>
            <Typography variant="body2" className="text-footer-muted">
              {t('shell:footer.tagline')}
            </Typography>
            <ul className="m-0 flex list-none gap-2 p-0">
              {circles.map((circle) => (
                <li key={circle.key}>
                  <a
                    href={circle.href}
                    aria-label={t(`shell:footer.icons.${circle.key}`)}
                    className="flex size-11 items-center justify-center rounded-full border border-footer-line bg-footer-tile text-footer-text transition-colors hover:border-footer-accent hover:text-footer-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-text"
                    {...(circle.href.startsWith('http')
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                  >
                    {circle.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {columns.map((column) => (
            <nav
              key={column.key}
              aria-labelledby={`footer-${column.key}`}
              className="flex flex-col gap-3"
            >
              <Typography
                id={`footer-${column.key}`}
                variant="overline"
                component="h2"
                className="text-footer-muted"
              >
                {t(`shell:footer.columns.${column.key}`)}
              </Typography>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {column.links.map((item) => (
                  <li key={item.key}>
                    {item.external ? (
                      <a href={item.to} target="_blank" rel="noreferrer" className={linkClass}>
                        <Typography variant="subtitle2" component="span">
                          {item.label}
                        </Typography>
                      </a>
                    ) : (
                      <Link to={item.to} className={linkClass}>
                        <Typography variant="subtitle2" component="span">
                          {item.label}
                        </Typography>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-footer-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="body2" className="text-footer-muted">
            {t('shell:footer.rights', { year })}
          </Typography>
          <Typography variant="body2" className="text-footer-muted">
            {user ? (
              t('shell:footer.signedInAs', { name: user.firstName })
            ) : (
              <>
                {t('shell:footer.haveAccount')}{' '}
                <Link
                  to={PATHS.login}
                  className="font-medium text-footer-text underline-offset-4 hover:underline"
                >
                  {t('shell:footer.signInLink')}
                </Link>
              </>
            )}
          </Typography>
        </div>
      </div>
    </footer>
  );
}
