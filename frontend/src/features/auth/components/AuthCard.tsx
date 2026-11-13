import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode, Ref } from 'react';
import { BrandLogo } from './BrandLogo';
import { PageShell } from './PageShell';

export interface AuthCardProps {
  /** The page's <h1>; takes focus on arrival (usePageHeadingFocus in the page). */
  headingRef: Ref<HTMLHeadingElement>;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** A line under the card, e.g. "Already have an account? Sign in". */
  footer?: ReactNode;
  /** Something beside the card on wide screens (the sign-in page's preview). */
  aside?: ReactNode;
}

/** The signed-out screens' frame: brand, one card, a footer line. */
export function AuthCard({ headingRef, title, subtitle, children, footer, aside }: AuthCardProps) {
  return (
    <PageShell className="items-center justify-center px-4 py-8 md:px-8">
      <div className="flex w-full max-w-7xl items-center justify-center gap-12 lg:items-stretch xl:gap-20">
        <div className="flex w-full max-w-md shrink-0 flex-col gap-8">
          <BrandLogo />
          <Card variant="outlined">
            <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="flex flex-col gap-1">
                <Typography
                  ref={headingRef}
                  tabIndex={-1}
                  variant="h4"
                  component="h1"
                  className="outline-none"
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" color="textSecondary">
                    {subtitle}
                  </Typography>
                )}
              </div>
              {children}
            </CardContent>
          </Card>
          {footer && (
            <Typography variant="body2" color="textSecondary" className="text-center">
              {footer}
            </Typography>
          )}
        </div>
        {aside}
      </div>
    </PageShell>
  );
}
