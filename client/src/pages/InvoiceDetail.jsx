import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Send, Trash2, Ban, Undo2, X } from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { StatusBadge, Loading } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { fmtDate, METHOD_LABEL, money, toInputDate } from '../utils.js';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [pay, setPay] = useState({ amount: '', method: 'bank_transfer', date: toInputDate(), note: '' });
  const [busy, setBusy] = useState(false);
  const biz = user.business || {};
  const cur = biz.currency || 'USD';

  useEffect(() => {
    api.get(`/invoices/${id}`).then((r) => setInv(r.data)).catch((e) => { toast.error(errorMessage(e)); navigate('/invoices'); });
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (inv) setPay((p) => ({ ...p, amount: inv.balance > 0 ? String(inv.balance) : '' }));
  }, [inv?.balance]); // eslint-disable-line

  if (!inv) return <Loading />;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.data?._id) setInv(res.data);
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status, msg) => run(() => api.put(`/invoices/${id}`, { status }), msg);

  const download = async () => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not generate the PDF. Try again in a moment.');
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${inv.number}? This cannot be undone.`)) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      navigate('/invoices');
    } catch (err) { toast.error(errorMessage(err)); }
  };

  const addPayment = (e) => {
    e.preventDefault();
    run(() => api.post(`/invoices/${id}/payments`, pay), 'Payment recorded');
  };

  const status = inv.displayStatus;
  const canPay = !['draft', 'cancelled', 'paid'].includes(status) || status === 'draft';

  return (
    <>
      <Link to="/invoices" className="back"><ArrowLeft size={15} /> Invoices</Link>
      <header className="page-header">
        <div className="profile-title">
          <h1>{inv.number}</h1>
          <StatusBadge status={status} />
        </div>
        <div className="page-actions">
          {inv.status === 'draft' && <button className="btn btn-primary" disabled={busy} onClick={() => setStatus('sent', 'Marked as sent')}><Send size={15} /> Mark as sent</button>}
          <button className="btn btn-ghost" onClick={download}><Download size={15} /> Download PDF</button>
          {inv.status !== 'cancelled' && <Link className="btn btn-ghost" to={`/invoices/${id}/edit`}><Pencil size={15} /> Edit</Link>}
        </div>
      </header>

      <div className="detail">
        <article className="paper">
          <div className="paper-top">
            <div>
              <h2>{biz.name || 'Your business'}</h2>
              <div className="muted small pre">{[biz.address, biz.email, biz.phone].filter(Boolean).join('\n')}</div>
            </div>
            <div className="paper-title">
              <span>Invoice</span>
              <strong>{inv.number}</strong>
            </div>
          </div>

          <div className="paper-meta">
            <div>
              <span className="label">Billed to</span>
              <strong>{inv.client?.name}</strong>
              <div className="muted small pre">{[inv.client?.company, inv.client?.address, inv.client?.email].filter(Boolean).join('\n')}</div>
            </div>
            <div><span className="label">Issued</span><strong>{fmtDate(inv.issueDate)}</strong></div>
            <div><span className="label">Due</span><strong>{fmtDate(inv.dueDate)}</strong></div>
          </div>

          <table className="paper-table">
            <thead>
              <tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.description}</td>
                  <td className="r num">{it.quantity}</td>
                  <td className="r num">{money(it.unitPrice, cur)}</td>
                  <td className="r num">{money(it.quantity * it.unitPrice, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="totals paper-totals">
            <div><dt>Subtotal</dt><dd className="num">{money(inv.subtotal, cur)}</dd></div>
            {inv.discount > 0 && <div><dt>Discount</dt><dd className="num">−{money(inv.discount, cur)}</dd></div>}
            {inv.taxRate > 0 && <div><dt>Tax ({inv.taxRate}%)</dt><dd className="num">{money(inv.taxAmount, cur)}</dd></div>}
            <div className="grand"><dt>Total</dt><dd className="num">{money(inv.total, cur)}</dd></div>
            {inv.amountPaid > 0 && <div><dt>Paid</dt><dd className="num">−{money(inv.amountPaid, cur)}</dd></div>}
            <div className="due"><dt>Balance due</dt><dd className="num">{money(inv.balance, cur)}</dd></div>
          </dl>

          {inv.notes && (
            <div className="paper-notes">
              <span className="label">Notes</span>
              <p className="pre">{inv.notes}</p>
            </div>
          )}
        </article>

        <aside className="side">
          <section className="panel">
            <div className="panel-head"><h2>Payments</h2></div>
            {inv.payments.length === 0 ? (
              <p className="muted small pad">No payments recorded yet.</p>
            ) : (
              <ul className="list">
                {inv.payments.map((p) => (
                  <li key={p._id} className="list-row">
                    <div>
                      <strong className="num">{money(p.amount, cur)}</strong>
                      <span className="muted small">{METHOD_LABEL[p.method]} · {fmtDate(p.date)}</span>
                      {p.note && <span className="muted small">{p.note}</span>}
                    </div>
                    <button className="icon-btn" aria-label="Remove payment" onClick={() => window.confirm('Remove this payment?') && run(() => api.delete(`/invoices/${id}/payments/${p._id}`), 'Payment removed')}>
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {inv.status !== 'cancelled' && inv.balance > 0 && (
              <form onSubmit={addPayment} className="form pay-form">
                <h3 className="section-title">Record a payment</h3>
                <div className="grid-2">
                  <label className="field">
                    <span>Amount</span>
                    <input type="number" min="0.01" step="any" max={inv.balance} required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Date</span>
                    <input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
                  </label>
                </div>
                <label className="field">
                  <span>Method</span>
                  <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                    {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Note</span>
                  <input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder="Reference or memo (optional)" />
                </label>
                <button className="btn btn-primary btn-block" disabled={busy}>Record payment</button>
              </form>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Manage</h2></div>
            <div className="stack">
              {inv.status === 'cancelled' ? (
                <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => setStatus('sent', 'Invoice reopened')}><Undo2 size={15} /> Reopen invoice</button>
              ) : (
                <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => window.confirm('Cancel this invoice? You can reopen it later.') && setStatus('cancelled', 'Invoice cancelled')}><Ban size={15} /> Cancel invoice</button>
              )}
              <button className="btn btn-ghost btn-block danger-text" onClick={remove}><Trash2 size={15} /> Delete invoice</button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
