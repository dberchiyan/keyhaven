import { type ReactNode, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';

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
import { MessagesPage } from '@/features/message';
import { SettingsPage } from '@/features/settings';
import { AppLayout, NotFoundPage, RoleLayout, SiteLayout } from '@/features/shell';
import { ViewingsPage } from '@/features/viewing';
import { PageLoader } from '@/shared/components/page-loader';
import { RouteErrorBoundary } from '@/shared/components/route-error-boundary';
import { PATHS } from '@/shared/lib/paths';

const route = (element: ReactNode): ReactNode => (
    <RouteErrorBoundary>
        <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </RouteErrorBoundary>
);

export const router = createBrowserRouter([
    { path: PATHS.login, element: route(<LoginPage />) },
    { path: PATHS.signup, element: route(<SignupPage />) },
    { path: PATHS.verifyEmail, element: route(<VerifyEmailPage />) },
    { path: PATHS.forgotPassword, element: route(<ForgotPasswordPage />) },
    { path: PATHS.resetPassword, element: route(<ResetPasswordPage />) },
    {
        element: <SiteLayout />,
        children: [
            { path: PATHS.browse, element: route(<BrowsePage />) },
            { path: PATHS.listing, element: route(<ListingPage />) },
        ],
    },
    {
        element: <RoleLayout />,
        children: [{ path: PATHS.home, element: route(<HomePage />) }],
    },
    {
        element: <RequireAuth />,
        children: [
            {
                element: <RoleLayout />,
                children: [
                    {
                        element: <RequireAccess part="section.saved" />,
                        children: [{ path: PATHS.saved, element: route(<SavedPage />) }],
                    },
                    {
                        element: <RequireAccess part="section.viewings" />,
                        children: [{ path: PATHS.viewings, element: route(<ViewingsPage />) }],
                    },
                    {
                        element: <RequireAccess part="section.messages" />,
                        children: [
                            { path: PATHS.messages, element: route(<MessagesPage />) },
                            { path: PATHS.conversation, element: route(<MessagesPage />) },
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
            {
                element: <AppLayout />,
                children: [
                    {
                        element: <RequireAccess part="section.listings" />,
                        children: [
                            { path: PATHS.newListing, element: route(<ListingEditorPage />) },
                            { path: PATHS.managedListing, element: route(<ManagedListingPage />) },
                            { path: PATHS.editListing, element: route(<ListingEditorPage />) },
                        ],
                    },
                ],
            },
        ],
    },
    {
        element: <RoleLayout />,
        children: [{ path: '*', element: route(<NotFoundPage />) }],
    },
]);
