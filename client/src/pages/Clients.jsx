import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { PageHeader, StatusBadge, Loading, Empty } from '../components/ui.jsx';
import ClientForm from '../components/ClientForm.jsx';
import { useToast } from '../components/Toast.jsx';
import { initials, money } from '../utils.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'lead', label: 'Leads' },
  { id: 'inactive', label: 'Inactive' },
];

export default function Clients() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const cur = user.business?.currency || 'USD';

  const load = () =>
    api
      .get('/clients', { params: { status, search } })
      .then((r) => setClients(r.data))
      .catch((e) => toast.error(errorMessage(e)));

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [status, search]);

  return (
    <>
      <PageHeader title="Clients" subtitle="Everyone you work with, and what they owe.">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add client</button>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={status === t.id} className={`tab${status === t.id ? ' on' : ''}`} onClick={() => setStatus(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input placeholder="Search name, company or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <section className="panel flush">
        {!clients ? (
          <Loading />
        ) : clients.length === 0 ? (
          <Empty title={search || status !== 'all' ? 'No clients match' : 'No clients yet'} text={search || status !== 'all' ? 'Try a different search or filter.' : 'Add your first client to start sending invoices.'}>
            {!search && status === 'all' && <button className="btn btn-primary" onClick={() => setAdding(true)}>Add client</button>}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="r">Billed</th>
                  <th className="r">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c._id} className="clickable" onClick={() => navigate(`/clients/${c._id}`)}>
                    <td>
                      <div className="person">
                        <span className="avatar sm">{initials(c.name)}</span>
                        <div><strong>{c.name}</strong><span className="muted small">{c.company || '—'}</span></div>
                      </div>
                    </td>
                    <td><span>{c.email || '—'}</span><span className="muted small">{c.phone}</span></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="r num">{money(c.billed, cur)}</td>
                    <td className={`r num${c.outstanding > 0 ? ' warn' : ''}`}>{money(c.outstanding, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adding && (
        <ClientForm
          onClose={() => setAdding(false)}
          onSaved={(c) => { setAdding(false); navigate(`/clients/${c._id}`); }}
        />
      )}
    </>
  );
}
