import { Navigate } from 'react-router';
import { useAccess } from '@/features/auth';
import { PATHS } from '@/shared/lib/paths';
import { ManagedListingsDashboard } from '../components/ManagedListingsDashboard';

/** `/`: the listings dashboard for people who manage homes; tenants land on Browse. */
export default function HomePage() {
    const can = useAccess();
    if (!can('home.manage')) {
        return <Navigate to={PATHS.browse} replace />;
    }
    return <ManagedListingsDashboard />;
}
