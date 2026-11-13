import GitHub from '@mui/icons-material/GitHub';
import MailOutlined from '@mui/icons-material/MailOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { BrandMark } from '@/shared/components/BrandMark';
import { cn } from '@/shared/lib/cn';
import { useCities } from '@/features/listing';
import { browseSearch } from '@/shared/lib/listingSearch';
import { PATHS, settingsPath } from '@/shared/lib/paths';

/** Where the code and the docs live (a public demo; the repository is the "about" page). */
const GITHUB_URL = 'https://github.com/dberchiyan/keyhaven';
const README_URL = `${GITHUB_URL}#readme`;
const CONTACT_EMAIL = 'hello@keyhaven.example';

type ColumnKey = 'browse' | 'cities' | 'company';
type LinkKey = 'rent' | 'buy' | 'houses' | 'about' | 'listHome' | 'github';
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
 * (mark, name, one line, three round icon links), three titled columns — Browse, Cities (two
 * columns, alphabetical), Company — then the fine print and a sign-in link.
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
  // "List your home": sign-up for a visitor, the dashboard for someone who already lists.
  const listHome = user && can('home.manage') ? PATHS.home : `${PATHS.signup}?role=landlord`;
  const columns: { key: ColumnKey; links: FooterLink[]; twoColumns?: boolean }[] = [
    {
      key: 'browse',
      links: [
        link('rent', `${PATHS.browse}?${browseSearch({ kind: 'rent' })}`),
        link('buy', `${PATHS.browse}?${browseSearch({ kind: 'sale' })}`),
        link('houses', `${PATHS.browse}?${browseSearch({ kind: 'rent', type: 'HOUSE' })}`),
      ],
    },
    {
      key: 'cities',
      twoColumns: true,
      links: [...(cities ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((city) => ({
          key: city.slug,
          label: city.name,
          to: `${PATHS.browse}?${browseSearch({ kind: 'rent', city: city.slug })}`,
        })),
    },
    {
      key: 'company',
      links: [
        { ...link('about', README_URL), external: true },
        link('listHome', listHome),
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
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:justify-between md:gap-x-16 md:gap-y-8">
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
              <ul
                className={cn(
                  'm-0 list-none p-0',
                  column.twoColumns
                    ? 'grid grid-cols-2 gap-x-6 gap-y-0.5'
                    : 'flex flex-col gap-0.5',
                )}
              >
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
              <Link
                to={settingsPath('account')}
                className="font-medium text-footer-text underline-offset-4 hover:underline"
              >
                {t('shell:footer.signedInAs', { name: user.firstName })}
              </Link>
            ) : (
              <Link
                to={PATHS.login}
                className="font-medium text-footer-text underline-offset-4 hover:underline"
              >
                {t('shell:footer.signInLink')}
              </Link>
            )}
          </Typography>
        </div>
      </div>
    </footer>
  );
}
