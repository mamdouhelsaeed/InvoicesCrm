import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { Loading } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { money, toInputDate } from '../utils.js';

const blankItem = () => ({ description: '', quantity: 1, unitPrice: '' });

export default function InvoiceForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const biz = user.business || {};
  const cur = biz.currency || 'USD';

  const [clients, setClients] = useState(null);
  const [loaded, setLoaded] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const issue = new Date();
    const due = new Date(issue.getTime() + (biz.paymentTerms ?? 14) * 86400000);
    return {
      client: params.get('client') || '',
      issueDate: toInputDate(issue),
      dueDate: toInputDate(due),
      items: [blankItem()],
      taxRate: biz.taxRate ?? 0,
      discount: 0,
      notes: '',
      status: 'draft',
    };
  });

  useEffect(() => {
    api.get('/clients').then((r) => setClients(r.data.filter((c) => c.status !== 'inactive' || c._id === form.client)));
    if (editing) {
      api.get(`/invoices/${id}`).then((r) => {
        const i = r.data;
        setForm({
          client: i.client._id,
          issueDate: toInputDate(i.issueDate),
          dueDate: toInputDate(i.dueDate),
          items: i.items.length ? i.items : [blankItem()],
          taxRate: i.taxRate,
          discount: i.discount,
          notes: i.notes,
          status: i.status,
        });
        setLoaded(true);
      }).catch((e) => { toast.error(errorMessage(e)); navigate('/invoices'); });
    }
    // eslint-disable-next-line
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setItem = (idx, k, v) =>
    setForm((f) => ({ ...f, items: f.items.map((it, n) => (n === idx ? { ...it, [k]: v } : it)) }));

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const discount = Math.min(Number(form.discount) || 0, subtotal);
    const tax = ((subtotal - discount) * (Number(form.taxRate) || 0)) / 100;
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [form]);

  const save = async (nextStatus) => {
    if (!form.client) return toast.error('Choose a client for this invoice.');
    if (!form.items.some((i) => i.description.trim())) return toast.error('Add at least one line item with a description.');
    setSaving(true);
    try {
      const payload = { ...form, status: nextStatus || form.status };
      const res = editing ? await api.put(`/invoices/${id}`, payload) : await api.post('/invoices', payload);
      toast.success(editing ? 'Invoice updated' : nextStatus === 'sent' ? 'Invoice created and marked as sent' : 'Draft saved');
      navigate(`/invoices/${res.data._id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded || !clients) return <Loading />;

  if (clients.length === 0) {
    return (
      <div className="panel empty">
        <h3>Add a client first</h3>
        <p className="muted">Every invoice is billed to a client.</p>
        <Link to="/clients" className="btn btn-primary">Go to clients</Link>
      </div>
    );
  }

  return (
    <>
      <Link to={editing ? `/invoices/${id}` : '/invoices'} className="back"><ArrowLeft size={15} /> {editing ? 'Back to invoice' : 'Invoices'}</Link>
      <header className="page-header"><div><h1>{editing ? 'Edit invoice' : 'New invoice'}</h1></div></header>

      <div className="composer">
        <section className="panel">
          <div className="grid-3">
            <label className="field">
              <span>Client</span>
              <select value={form.client} onChange={set('client')}>
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Issue date</span>
              <input type="date" value={form.issueDate} onChange={set('issueDate')} />
            </label>
            <label className="field">
              <span>Due date</span>
              <input type="date" value={form.dueDate} onChange={set('dueDate')} />
            </label>
          </div>

          <h3 className="section-title">Line items</h3>
          <div className="items">
            <div className="item-row item-head">
              <span>Description</span><span>Qty</span><span>Unit price</span><span className="r">Amount</span><span />
            </div>
            {form.items.map((it, idx) => (
              <div className="item-row" key={idx}>
                <input placeholder="What did you deliver?" value={it.description} onChange={(e) => setItem(idx, 'description', e.target.value)} aria-label="Description" />
                <input type="number" min="0" step="any" value={it.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} aria-label="Quantity" />
                <input type="number" min="0" step="any" placeholder="0.00" value={it.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', e.target.value)} aria-label="Unit price" />
                <span className="r num amount">{money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), cur)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove item"
                  disabled={form.items.length === 1}
                  onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, n) => n !== idx) }))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }))}>
            <Plus size={14} /> Add line item
          </button>

          <label className="field mt">
            <span>Notes for the client</span>
            <textarea rows={3} placeholder="Payment instructions, thank-you message, project reference…" value={form.notes} onChange={set('notes')} />
          </label>
        </section>

        <aside className="panel summary">
          <h3>Summary</h3>
          <label className="field">
            <span>Discount ({cur})</span>
            <input type="number" min="0" step="any" value={form.discount} onChange={set('discount')} />
          </label>
          <label className="field">
            <span>Tax rate (%)</span>
            <input type="number" min="0" max="100" step="any" value={form.taxRate} onChange={set('taxRate')} />
          </label>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd className="num">{money(totals.subtotal, cur)}</dd></div>
            {totals.discount > 0 && <div><dt>Discount</dt><dd className="num">−{money(totals.discount, cur)}</dd></div>}
            <div><dt>Tax</dt><dd className="num">{money(totals.tax, cur)}</dd></div>
            <div className="grand"><dt>Total</dt><dd className="num">{money(totals.total, cur)}</dd></div>
          </dl>
          {editing ? (
            <button className="btn btn-primary btn-block" disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save changes'}</button>
          ) : (
            <>
              <button className="btn btn-primary btn-block" disabled={saving} onClick={() => save('sent')}>Create and mark as sent</button>
              <button className="btn btn-ghost btn-block" disabled={saving} onClick={() => save('draft')}>Save as draft</button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
