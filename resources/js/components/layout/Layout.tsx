import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';

export function Layout() {
    // Initialize offline sync - listens for online events and syncs pending positions
    useOfflineSync();

    return (
        <div className="min-h-screen bg-gray-900">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
            <PWAInstallBanner />
        </div>
    );
}
