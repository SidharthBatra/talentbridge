import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { roleHome } from '../../routes/ProtectedRoute';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.login({ email, password });
      setTokens(tokens);
      toast.success('Welcome back', `Signed in as ${tokens.user.name}`);
      navigate(roleHome(tokens.user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your workspace."
      footer={
        <p className="text-on-surface-variant text-body-md">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Register now
          </Link>
        </p>
      }
    >
      <form className="space-y-lg" onSubmit={handleSubmit}>
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="space-y-xs">
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-md top-[34px] text-outline hover:text-on-surface transition-colors"
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error && <p className="text-error text-body-md">{error}</p>}

        <Button type="submit" className="w-full" loading={loading} icon={loading ? undefined : 'arrow_forward'}>
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}
