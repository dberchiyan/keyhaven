import GitHub from '@mui/icons-material/GitHub';
import MailOutlined from '@mui/icons-material/MailOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAccess, useCurrentUser } from '@/features/auth';
import { BrandMark } from '@/shared/components/BrandMark';
import { browseSearch } from '@/shared/lib/listingSearch';
import { PATHS, settingsPath } from '@/shared/lib/paths';

/** Where the code and the docs live (a public demo; the repository is the "about" page). */
const GITHUB_URL = 'https://github.com/dberchiyan/keyhaven';
const README_URL = `${GITHUB_URL}#readme`;
const CONTACT_EMAIL = 'hello@keyhaven.example';

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
type ColumnKey = 'browse' | 'account';
type CircleKey = 'github' | 'readme' | 'email';

interface FooterLink {
  key: LinkKey;
  to: string;
  external?: boolean;
}

/**
 * The public site's footer: a deep forest band with the brand and a line about the site, three
 * round icon links, two columns of links, then the fine print and a sign-in nudge.
 */
export function SiteFooter() {
  const { t } = useTranslation(['shell', 'common']);
  const { data: user } = useCurrentUser();
  const can = useAccess();
  const year = new Date().getUTCFullYear();
  const columns: { key: ColumnKey; links: FooterLink[] }[] = [
    {
      key: 'browse',
      links: [
        { key: 'rent', to: `${PATHS.browse}?${browseSearch({ kind: 'rent' })}` },
        { key: 'buy', to: `${PATHS.browse}?${browseSearch({ kind: 'sale' })}` },
        { key: 'houses', to: `${PATHS.browse}?${browseSearch({ kind: 'rent', type: 'HOUSE' })}` },
        ...(user && can('section.saved') ? [{ key: 'saved' as const, to: PATHS.saved }] : []),
      ],
    },
    {
      key: 'account',
      links: [
        ...(user
          ? [
              { key: 'settings' as const, to: settingsPath('account') },
              ...(can('home.manage') ? [{ key: 'dashboard' as const, to: PATHS.home }] : []),
            ]
          : [
              { key: 'signIn' as const, to: PATHS.login },
              { key: 'listHome' as const, to: `${PATHS.signup}?role=landlord` },
            ]),
        { key: 'readme', to: README_URL, external: true },
        { key: 'github', to: GITHUB_URL, external: true },
      ],
    },
  ];
  const circles: { key: CircleKey; href: string; icon: ReactNode }[] = [
    { key: 'github', href: GITHUB_URL, icon: <GitHub fontSize="small" /> },
    { key: 'readme', href: README_URL, icon: <MenuBookOutlined fontSize="small" /> },
    { key: 'email', href: `mailto:${CONTACT_EMAIL}`, icon: <MailOutlined fontSize="small" /> },
  ];
  const linkClass =
    'inline-flex min-h-9 items-center text-footer-text no-underline hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-text';

  return (
    <footer className="mt-10 bg-footer-background px-4 text-footer-text md:px-8">
      <div className="mx-auto flex w-full max-w-page flex-col gap-10 pt-12 pb-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr]">
          <div className="flex max-w-md flex-col gap-4">
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
                    className="flex size-11 items-center justify-center rounded-full border border-footer-line bg-footer-tile text-footer-text transition-colors hover:border-footer-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-footer-text"
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
            <nav key={column.key} aria-label={t(`shell:footer.columns.${column.key}`)}>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {column.links.map((link) => (
                  <li key={link.key}>
                    {link.external ? (
                      <a href={link.to} target="_blank" rel="noreferrer" className={linkClass}>
                        <Typography variant="subtitle2" component="span">
                          {t(`shell:footer.links.${link.key}`)}
                        </Typography>
                      </a>
                    ) : (
                      <Link to={link.to} className={linkClass}>
                        <Typography variant="subtitle2" component="span">
                          {t(`shell:footer.links.${link.key}`)}
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
                  className="text-footer-text underline-offset-4 hover:underline"
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
