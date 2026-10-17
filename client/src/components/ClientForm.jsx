import { useState } from 'react';
import api, { errorMessage } from '../api';
import { Modal } from './ui.jsx';
import { useToast } from './Toast.jsx';

export default function ClientForm({ client, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: client?.name || '',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    status: client?.status || 'lead',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = client ? await api.put(`/clients/${client._id}`, form) : await api.post('/clients', form);
      toast.success(client ? 'Client updated' : 'Client added');
      onSaved(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={client ? 'Edit client' : 'Add client'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="grid-2">
          <label className="field">
            <span>Full name</span>
            <input required value={form.name} onChange={set('name')} autoFocus />
          </label>
          <label className="field">
            <span>Company</span>
            <input value={form.company} onChange={set('company')} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={set('phone')} />
          </label>
        </div>
        <label className="field">
          <span>Address</span>
          <input value={form.address} onChange={set('address')} />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={form.status} onChange={set('status')}>
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : client ? 'Save changes' : 'Add client'}</button>
        </div>
      </form>
    </Modal>
  );
}
