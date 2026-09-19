import { NavLink, useLocation } from 'react-router-dom';
import { Home, Package, Bell, ClipboardList, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/stock', icon: Package, label: 'Stock' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/history', icon: ClipboardList, label: 'History' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

export default function BottomNavigation() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[--color-border] safe-area-inset-bottom lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-orange-500 rounded-b-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={isActive ? 'text-orange-500' : 'text-gray-400'}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] font-semibold leading-none ${
                  isActive ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
      {/* Safe area spacer */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}
