import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { roleHome } from '../../routes/ProtectedRoute';
import { Role } from '../../types';
import { AuthLayout } from './AuthLayout';

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: Role.CANDIDATE, label: 'Candidate', description: 'Browse jobs & apply' },
  { value: Role.RECRUITER, label: 'Recruiter', description: 'Post jobs & manage pipeline' },
  { value: Role.HIRING_MANAGER, label: 'Hiring Manager', description: 'Interview & decide' },
  { value: Role.ADMIN, label: 'Admin', description: 'Manage users & analytics' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: Role.CANDIDATE });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.register(form);
      setTokens(tokens);
      toast.success('Account created', `Welcome to TalentBridge, ${tokens.user.name}`);
      navigate(roleHome(tokens.user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Role is selectable here for demo purposes."
      footer={
        <p className="text-on-surface-variant text-body-md">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-lg" onSubmit={handleSubmit}>
        <Input
          label="Full Name"
          placeholder="Jane Doe"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <Select
          label="I am a..."
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.description}
            </option>
          ))}
        </Select>

        {error && <p className="text-error text-body-md">{error}</p>}

        <Button type="submit" className="w-full" loading={loading} icon={loading ? undefined : 'arrow_forward'}>
          Create Account
        </Button>
      </form>
    </AuthLayout>
  );
}
