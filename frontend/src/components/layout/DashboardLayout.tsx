import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Icon } from '../ui/Icon';

export interface NavItem {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  workspaceLabel: string;
  workspaceSubtitle: string;
  tintClass: string; // e.g. 'bg-candidate-tint'
  accentClass: string; // e.g. 'bg-secondary-container text-on-secondary-container' active nav pill
  children: ReactNode;
}

/**
 * Shared shell for every role dashboard — sidebar nav + topbar + tinted
 * content area, mirroring the Stitch "recruiter_workspace" reference
 * pattern (SideNavBar, active-pill nav items, logout at the bottom).
 */
export function DashboardLayout({
  navItems,
  workspaceLabel,
  workspaceSubtitle,
  tintClass,
  accentClass,
  children,
}: DashboardLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClasses = (isActive: boolean) =>
    `flex items-center gap-md px-md py-sm rounded-lg transition-colors font-body-md text-body-md ${
      isActive
        ? `${accentClass} font-semibold`
        : 'text-on-surface-variant hover:bg-surface-container-high'
    }`;

  const sidebarContent = (
    <>
      <div className="py-md px-xs">
        <div className="flex items-center gap-xs mb-xs">
          <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-md">
            <Icon name="badge" className="text-on-primary" size={18} />
          </div>
          <span className="text-title-md font-title-md text-primary">TalentBridge</span>
        </div>
        <h2 className="text-headline-lg-mobile font-headline-lg-mobile text-on-surface leading-tight">
          {workspaceLabel}
        </h2>
        <p className="text-body-md text-on-surface-variant opacity-70">{workspaceSubtitle}</p>
      </div>
      <nav className="space-y-xs pt-md flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => navLinkClasses(isActive)}
            onClick={() => setMobileOpen(false)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-lg border-t border-outline-variant">
        <div className="flex items-center gap-sm px-md py-sm mb-xs">
          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-semibold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-body-md font-semibold text-on-surface truncate">{user?.name}</p>
            <p className="text-label-sm text-on-surface-variant truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <Icon name="logout" />
          <span className="text-body-md">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen flex ${tintClass}`}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 p-md space-y-xs bg-surface-container-low border-r border-outline-variant w-64 shrink-0 overflow-y-auto scrollbar-thin">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-inverse-surface/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex flex-col h-full p-md space-y-xs bg-surface-container-low w-72 overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-md py-sm bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-30">
          <div className="flex items-center gap-xs">
            <div className="w-7 h-7 bg-primary flex items-center justify-center rounded-md">
              <Icon name="badge" className="text-on-primary" size={16} />
            </div>
            <span className="text-title-md font-title-md text-primary">TalentBridge</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-xs rounded-md hover:bg-surface-container-high"
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
        </header>

        <main className="flex-1 p-md md:p-margin-desktop space-y-xl">{children}</main>
      </div>
    </div>
  );
}
