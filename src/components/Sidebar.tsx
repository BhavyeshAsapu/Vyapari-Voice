import { NavLink } from 'react-router-dom';
import { Home, Package, Bell, ClipboardList, MoreHorizontal, Mic, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/stock', icon: Package, label: 'Stock' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/history', icon: ClipboardList, label: 'History' },
  { to: '/summary', icon: BarChart3, label: 'Summary' },
  { to: '/assistant', icon: Mic, label: 'Ask Vyapari' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

export default function Sidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col w-60 bg-white border-r border-[--color-border] h-screen sticky top-0 z-20 flex-shrink-0"
      aria-label="Sidebar navigation"
    >
      {/* Brand */}
      <div className="px-6 py-5 border-b border-[--color-border]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <Mic size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-[--color-text] text-sm leading-tight">Vyapari Voice</p>
            <p className="text-[10px] text-[--color-text-secondary]">Sri Lakshmi Stores</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-[--color-text-secondary] hover:bg-gray-50 hover:text-[--color-text]'
              }`
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} aria-hidden="true" className={isActive ? 'text-orange-500' : ''} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[--color-border]">
        <p className="text-xs text-[--color-text-secondary]">Vyapari Voice v1.0</p>
        <p className="text-xs text-[--color-text-secondary]">Milestone 1 — UI Demo</p>
      </div>
    </aside>
  );
}
