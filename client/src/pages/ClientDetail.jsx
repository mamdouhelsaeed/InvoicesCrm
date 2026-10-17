import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { StatusBadge, Loading, Empty } from '../components/ui.jsx';
import ClientForm from '../components/ClientForm.jsx';
import { useToast } from '../components/Toast.jsx';
import { fmtDate, initials, money } from '../utils.js';

export default function ClientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const cur = user.business?.currency || 'USD';

  const load = () =>
    api.get(`/clients/${id}`).then((r) => setData(r.data)).catch((e) => { toast.error(errorMessage(e)); navigate('/clients'); });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!data) return <Loading />;
  const { client, invoices } = data;

  const billed = invoices.filter((i) => ['sent', 'partial', 'paid', 'overdue'].includes(i.displayStatus)).reduce((s, i) => s + i.total, 0);
  const paid = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = invoices.filter((i) => ['sent', 'partial', 'overdue'].includes(i.displayStatus)).reduce((s, i) => s + i.balance, 0);

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      const r = await api.post(`/clients/${id}/notes`, { text: note });
      setData((d) => ({ ...d, client: r.data }));
      setNote('');
    } catch (err) { toast.error(errorMessage(err)); }
  };

  const removeNote = async (noteId) => {
    const r = await api.delete(`/clients/${id}/notes/${noteId}`);
    setData((d) => ({ ...d, client: r.data }));
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${client.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client deleted');
      navigate('/clients');
    } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <>
      <Link to="/clients" className="back"><ArrowLeft size={15} /> Clients</Link>

      <section className="panel profile">
        <span className="avatar lg">{initials(client.name)}</span>
        <div className="profile-main">
          <div className="profile-title">
            <h1>{client.name}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="muted">{client.company || 'No company on file'}</p>
          <div className="contact">
            {client.email && <span><Mail size={15} /> {client.email}</span>}
            {client.phone && <span><Phone size={15} /> {client.phone}</span>}
            {client.address && <span><MapPin size={15} /> {client.address}</span>}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Pencil size={15} /> Edit</button>
          <button className="btn btn-ghost danger-text" onClick={remove}><Trash2 size={15} /> Delete</button>
        </div>
      </section>

      <div className="facts">
        <div><span className="label">Billed</span><strong className="big sm">{money(billed, cur)}</strong></div>
        <div><span className="label">Paid</span><strong className="big sm">{money(paid, cur)}</strong></div>
        <div><span className="label">Outstanding</span><strong className={`big sm${outstanding > 0 ? ' warn' : ''}`}>{money(outstanding, cur)}</strong></div>
      </div>

      <div className="cols cols-wide">
        <section className="panel">
          <div className="panel-head">
            <h2>Invoices</h2>
            <Link to={`/invoices/new?client=${client._id}`} className="btn btn-primary btn-sm"><Plus size={14} /> New invoice</Link>
          </div>
          {invoices.length === 0 ? (
            <Empty title="No invoices for this client" text="Create one to start tracking what they owe." />
          ) : (
            <ul className="list">
              {invoices.map((inv) => (
                <li key={inv._id} className="list-row clickable" onClick={() => navigate(`/invoices/${inv._id}`)}>
                  <div>
                    <strong>{inv.number}</strong>
                    <span className="muted small">Issued {fmtDate(inv.issueDate)} · due {fmtDate(inv.dueDate)}</span>
                  </div>
                  <div className="right">
                    <strong className="num">{money(inv.total, cur)}</strong>
                    <StatusBadge status={inv.displayStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Notes</h2></div>
          <form onSubmit={addNote} className="note-form">
            <textarea rows={3} placeholder="Add a note about this client" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!note.trim()}>Save note</button>
          </form>
          {client.notes.length === 0 ? (
            <p className="muted small pad">No notes yet. Use notes to remember preferences, agreements and follow-ups.</p>
          ) : (
            <ul className="notes">
              {client.notes.map((n) => (
                <li key={n._id}>
                  <p>{n.text}</p>
                  <div className="note-meta">
                    <span className="muted small">{fmtDate(n.createdAt)}</span>
                    <button className="link small danger-text" onClick={() => removeNote(n._id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && <ClientForm client={client} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </>
  );
}
