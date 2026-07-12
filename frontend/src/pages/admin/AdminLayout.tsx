import { Outlet } from 'react-router-dom';
import { DashboardLayout, type NavItem } from '../../components/layout/DashboardLayout';

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/users', icon: 'group', label: 'User Management' },
  { to: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
];

export function AdminLayout() {
  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      workspaceLabel="Admin Console"
      workspaceSubtitle="Platform oversight"
      tintClass="bg-admin-tint"
      accentClass="bg-inverse-surface text-inverse-on-surface"
    >
      <Outlet />
    </DashboardLayout>
  );
}
