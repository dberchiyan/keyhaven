import { Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import {
  ForgotPasswordPage,
  LoginPage,
  RequireAccess,
  RequireAuth,
  ResetPasswordPage,
  SignupPage,
  VerifyEmailPage,
} from '@/features/auth';
import {
  BrowsePage,
  HomePage,
  ListingEditorPage,
  ListingPage,
  ManagedListingPage,
  SavedPage,
} from '@/features/listing';
import { SettingsPage } from '@/features/settings';
import { AppLayout } from '@/features/shell';
import { PageLoader } from '@/shared/components/PageLoader';
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary';
import { PATHS } from '@/shared/lib/paths';

const route = (element: ReactNode): ReactNode => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>{element}</Suspense>
  </RouteErrorBoundary>
);

export const router = createBrowserRouter([
  { path: PATHS.login, element: route(<LoginPage />) },
  { path: PATHS.signup, element: route(<SignupPage />) },
  // The emailed links work signed in or not.
  { path: PATHS.verifyEmail, element: route(<VerifyEmailPage />) },
  { path: PATHS.forgotPassword, element: route(<ForgotPasswordPage />) },
  { path: PATHS.resetPassword, element: route(<ResetPasswordPage />) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Home: the listings dashboard for landlords, agents and admins; tenants go to Browse.
          { path: PATHS.home, element: route(<HomePage />) },
          {
            element: <RequireAccess part="section.browse" />,
            children: [
              { path: PATHS.browse, element: route(<BrowsePage />) },
              { path: PATHS.listing, element: route(<ListingPage />) },
            ],
          },
          {
            element: <RequireAccess part="section.saved" />,
            children: [{ path: PATHS.saved, element: route(<SavedPage />) }],
          },
          {
            element: <RequireAccess part="section.listings" />,
            children: [
              { path: PATHS.newListing, element: route(<ListingEditorPage />) },
              { path: PATHS.managedListing, element: route(<ManagedListingPage />) },
              { path: PATHS.editListing, element: route(<ListingEditorPage />) },
            ],
          },
          {
            element: <RequireAccess part="section.settings" />,
            children: [
              { path: PATHS.settings, element: route(<SettingsPage />) },
              { path: PATHS.settingsSection, element: route(<SettingsPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={PATHS.home} replace /> },
]);
