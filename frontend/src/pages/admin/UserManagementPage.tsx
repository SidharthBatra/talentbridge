import { useEffect, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { toast } from '../../store/toastStore';
import { Role, type User } from '../../types';

const ROLE_TONE: Record<Role, 'primary' | 'info' | 'warning' | 'success'> = {
  [Role.ADMIN]: 'primary',
  [Role.RECRUITER]: 'info',
  [Role.HIRING_MANAGER]: 'warning',
  [Role.CANDIDATE]: 'success',
};

export function UserManagementPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    setError(null);
    usersApi
      .list()
      .then(setUsers)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load users')));
  };

  useEffect(load, []);

  const handleDeactivate = async (user: User) => {
    setActingId(user.id);
    try {
      await usersApi.deactivate(user.id);
      toast.success('User deactivated', user.email);
      load();
    } catch (err) {
      toast.error('Could not deactivate user', apiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (users === null) return <LoadingState label="Loading users…" />;

  return (
    <div className="space-y-lg">
      <PageHeader title="User Management" subtitle={`${users.length} registered users`} />

      <Card className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wider">
              <th className="px-md py-sm">Name</th>
              <th className="px-md py-sm">Email</th>
              <th className="px-md py-sm">Role</th>
              <th className="px-md py-sm">Status</th>
              <th className="px-md py-sm">Joined</th>
              <th className="px-md py-sm" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors"
              >
                <td className="px-md py-sm text-body-md text-on-surface font-medium">{user.name}</td>
                <td className="px-md py-sm text-body-md text-on-surface-variant">{user.email}</td>
                <td className="px-md py-sm">
                  <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
                </td>
                <td className="px-md py-sm">
                  <Badge tone={user.isActive ? 'success' : 'error'}>
                    {user.isActive ? 'Active' : 'Deactivated'}
                  </Badge>
                </td>
                <td className="px-md py-sm text-body-md text-on-surface-variant">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-md py-sm text-right">
                  {user.isActive && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={actingId === user.id}
                      onClick={() => handleDeactivate(user)}
                    >
                      Deactivate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
