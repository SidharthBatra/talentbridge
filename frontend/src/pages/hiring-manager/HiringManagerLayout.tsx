import { Outlet } from 'react-router-dom';
import { DashboardLayout, type NavItem } from '../../components/layout/DashboardLayout';

const NAV_ITEMS: NavItem[] = [
  { to: '/hiring-manager/shortlist', icon: 'star', label: 'Shortlisted Candidates' },
];

export function HiringManagerLayout() {
  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      workspaceLabel="Hiring Manager"
      workspaceSubtitle="Interview & decide"
      tintClass="bg-hm-tint"
      accentClass="bg-tertiary-fixed text-on-tertiary-fixed-variant"
    >
      <Outlet />
    </DashboardLayout>
  );
}
