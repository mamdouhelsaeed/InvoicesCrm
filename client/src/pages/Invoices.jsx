import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { PageHeader, StatusBadge, Loading, Empty } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { fmtDate, money, STATUS_LABEL } from '../utils.js';

const TABS = ['all', 'draft', 'sent', 'partial', 'overdue', 'paid'];

export default function Invoices() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const cur = user.business?.currency || 'USD';

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/invoices', { params: { status, search } })
        .then((r) => setData(r.data))
        .catch((e) => toast.error(errorMessage(e)));
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [status, search]);

  return (
    <>
      <PageHeader title="Invoices" subtitle="Create, send and track every payment.">
        <Link to="/invoices/new" className="btn btn-primary"><Plus size={16} /> New invoice</Link>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={status === t} className={`tab${status === t ? ' on' : ''}`} onClick={() => setStatus(t)}>
              {t === 'all' ? 'All' : STATUS_LABEL[t]}
              {data && <span className="count">{data.counts[t]}</span>}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input placeholder="Search number or client" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <section className="panel flush">
        {!data ? (
          <Loading />
        ) : data.invoices.length === 0 ? (
          <Empty
            title={data.counts.all === 0 ? 'No invoices yet' : 'No invoices match'}
            text={data.counts.all === 0 ? 'Create your first invoice and send it to a client.' : 'Try a different status or search.'}
          >
            {data.counts.all === 0 && <Link to="/invoices/new" className="btn btn-primary">Create invoice</Link>}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th className="r">Total</th>
                  <th className="r">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((i) => (
                  <tr key={i._id} className="clickable" onClick={() => navigate(`/invoices/${i._id}`)}>
                    <td><strong>{i.number}</strong></td>
                    <td>{i.client?.name}<span className="muted small">{i.client?.company}</span></td>
                    <td>{fmtDate(i.issueDate)}</td>
                    <td>{fmtDate(i.dueDate)}</td>
                    <td className="r num">{money(i.total, cur)}</td>
                    <td className="r num">{money(i.balance, cur)}</td>
                    <td><StatusBadge status={i.displayStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
