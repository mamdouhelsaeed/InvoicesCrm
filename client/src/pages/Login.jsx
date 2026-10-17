import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { errorMessage } from '../api';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-art" aria-hidden="true">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span className="brand-name">Ledgerly</span>
        </div>
        <div className="auth-copy">
          <h1>Know who owes you, and when.</h1>
          <p>Keep clients, invoices and payments in one place, so getting paid stops being a side project.</p>
        </div>
        <div className="stub">
          <div className="stub-row stub-head">
            <span>INV-1042</span>
            <span className="stub-tag">Paid</span>
          </div>
          <div className="stub-row"><span>Brand identity package</span><span>$1,944.00</span></div>
          <div className="stub-row"><span>Tax (8%)</span><span>$144.00</span></div>
          <div className="stub-row stub-total"><span>Balance due</span><span>$0.00</span></div>
        </div>
      </section>

      <section className="auth-form">
        <form onSubmit={submit} className="auth-card">
          <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <p className="muted">
            {mode === 'login' ? 'Welcome back. Pick up where you left off.' : 'Set up your workspace in under a minute.'}
          </p>

          {mode === 'register' && (
            <>
              <label className="field">
                <span>Your name</span>
                <input required value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label className="field">
                <span>Business name</span>
                <input value={form.businessName} onChange={set('businessName')} autoComplete="organization" />
              </label>
            </>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="switch muted">
            {mode === 'login' ? 'New to Ledgerly?' : 'Already have an account?'}{' '}
            <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          {mode === 'login' && (
            <p className="hint">Demo data: run <code>npm run seed</code> in the server, then sign in with <code>demo@ledgerly.dev</code> / <code>demo1234</code>.</p>
          )}
        </form>
      </section>
    </div>
  );
}
