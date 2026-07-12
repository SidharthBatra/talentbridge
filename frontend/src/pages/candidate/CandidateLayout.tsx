import { Outlet } from 'react-router-dom';
import { DashboardLayout, type NavItem } from '../../components/layout/DashboardLayout';

const NAV_ITEMS: NavItem[] = [
  { to: '/candidate/jobs', icon: 'search', label: 'Find Jobs' },
  { to: '/candidate/applications', icon: 'work_history', label: 'My Applications' },
];

export function CandidateLayout() {
  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      workspaceLabel="Candidate Portal"
      workspaceSubtitle="Your career journey"
      tintClass="bg-candidate-tint"
      accentClass="bg-secondary-container text-on-secondary-container"
    >
      <Outlet />
    </DashboardLayout>
  );
}
