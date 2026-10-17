import { useState } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { PageHeader } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { CURRENCIES } from '../utils.js';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const b = user.business || {};
  const [name, setName] = useState(user.name);
  const [biz, setBiz] = useState({
    name: b.name || '',
    email: b.email || '',
    phone: b.phone || '',
    address: b.address || '',
    currency: b.currency || 'USD',
    taxRate: b.taxRate ?? 0,
    invoicePrefix: b.invoicePrefix || 'INV',
    paymentTerms: b.paymentTerms ?? 14,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setBiz((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/me', { name, business: biz });
      setUser(res.data.user);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Your business details appear on every invoice you send." />
      <form onSubmit={save} className="settings">
        <section className="panel form">
          <h2>Your account</h2>
          <label className="field"><span>Your name</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Sign-in email</span><input value={user.email} disabled /></label>
        </section>

        <section className="panel form">
          <h2>Business details</h2>
          <label className="field"><span>Business name</span><input value={biz.name} onChange={set('name')} /></label>
          <div className="grid-2">
            <label className="field"><span>Billing email</span><input type="email" value={biz.email} onChange={set('email')} /></label>
            <label className="field"><span>Phone</span><input value={biz.phone} onChange={set('phone')} /></label>
          </div>
          <label className="field"><span>Address</span><input value={biz.address} onChange={set('address')} /></label>
        </section>

        <section className="panel form">
          <h2>Invoice defaults</h2>
          <div className="grid-2">
            <label className="field">
              <span>Currency</span>
              <select value={biz.currency} onChange={set('currency')}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field"><span>Default tax rate (%)</span><input type="number" min="0" max="100" step="any" value={biz.taxRate} onChange={set('taxRate')} /></label>
            <label className="field"><span>Invoice number prefix</span><input value={biz.invoicePrefix} onChange={set('invoicePrefix')} maxLength={8} /></label>
            <label className="field"><span>Payment terms (days)</span><input type="number" min="0" value={biz.paymentTerms} onChange={set('paymentTerms')} /></label>
          </div>
        </section>

        <div className="settings-save">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </>
  );
}
