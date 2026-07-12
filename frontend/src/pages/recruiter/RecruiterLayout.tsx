import { Outlet } from 'react-router-dom';
import { DashboardLayout, type NavItem } from '../../components/layout/DashboardLayout';

const NAV_ITEMS: NavItem[] = [
  { to: '/recruiter/jobs', icon: 'work', label: 'Postings' },
  { to: '/recruiter/offers', icon: 'request_quote', label: 'Offer Responses' },
];

export function RecruiterLayout() {
  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      workspaceLabel="Recruiter Workspace"
      workspaceSubtitle="Global Talent Hub"
      tintClass="bg-recruiter-tint"
      accentClass="bg-primary-fixed text-on-primary-fixed-variant"
    >
      <Outlet />
    </DashboardLayout>
  );
}
