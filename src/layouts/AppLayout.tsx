import { Outlet } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import Sidebar from '@/components/Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[--color-bg]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNavigation />
    </div>
  );
}
