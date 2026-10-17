import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth.jsx';
import { PageHeader, StatusBadge, Loading, Empty } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { daysFromNow, fmtDate, money, moneyShort } from '../utils.js';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const cur = user.business?.currency || 'USD';

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e)));
    // eslint-disable-next-line
  }, []);

  if (!data) return <Loading />;

  const total = data.collectedYear + data.awaiting + data.overdue;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const delta =
    data.collectedLastMonth > 0
      ? Math.round(((data.collectedThisMonth - data.collectedLastMonth) / data.collectedLastMonth) * 100)
      : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader title={`${greeting}, ${user.name.split(' ')[0]}`} subtitle="Here is where your money stands today.">
        <Link to="/invoices/new" className="btn btn-primary"><Plus size={16} /> New invoice</Link>
      </PageHeader>

      <section className="panel cash">
        <div className="cash-figures">
          <div>
            <span className="label">Collected this month</span>
            <strong className="big">{money(data.collectedThisMonth, cur)}</strong>
            {delta !== null && (
              <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
                {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(delta)}% vs last month
              </span>
            )}
          </div>
          <div>
            <span className="label">Awaiting payment</span>
            <strong className="big">{money(data.awaiting, cur)}</strong>
          </div>
          <div>
            <span className="label">Overdue</span>
            <strong className={`big${data.overdue > 0 ? ' danger' : ''}`}>{money(data.overdue, cur)}</strong>
            {data.overdueCount > 0 && <span className="muted small">{data.overdueCount} invoice{data.overdueCount > 1 ? 's' : ''}</span>}
          </div>
          <div>
            <span className="label">Clients</span>
            <strong className="big">{data.clients.total}</strong>
            <span className="muted small">{data.clients.active} active, {data.clients.leads} leads</span>
          </div>
        </div>

        <div className="split-bar" role="img" aria-label="Collected, awaiting and overdue this year">
          <span className="seg seg-paid" style={{ width: `${pct(data.collectedYear)}%` }} />
          <span className="seg seg-wait" style={{ width: `${pct(data.awaiting)}%` }} />
          <span className="seg seg-late" style={{ width: `${pct(data.overdue)}%` }} />
        </div>
        <div className="legend">
          <span><i className="dot seg-paid" /> Collected this year {money(data.collectedYear, cur)}</span>
          <span><i className="dot seg-wait" /> Awaiting {money(data.awaiting, cur)}</span>
          <span><i className="dot seg-late" /> Overdue {money(data.overdue, cur)}</span>
        </div>
      </section>

      <div className="cols">
        <section className="panel">
          <div className="panel-head"><h2>Revenue collected</h2><span className="muted small">Last 6 months</span></div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E4E9E7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#66757A', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: '#66757A', fontSize: 12 }} tickFormatter={(v) => moneyShort(v, cur)} />
                <Tooltip cursor={{ fill: 'rgba(31,138,112,.08)' }} formatter={(v) => [money(v, cur), 'Collected']} contentStyle={{ borderRadius: 8, border: '1px solid #DDE3E1', fontFamily: 'Figtree' }} />
                <Bar dataKey="revenue" fill="#1F8A70" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Needs attention</h2><Link to="/invoices" className="link small">All invoices</Link></div>
          {data.attention.length === 0 ? (
            <Empty title="Nothing waiting on payment" text="Sent invoices that are unpaid will show up here." />
          ) : (
            <ul className="list">
              {data.attention.map((inv) => {
                const d = daysFromNow(inv.dueDate);
                return (
                  <li key={inv._id} className="list-row clickable" onClick={() => navigate(`/invoices/${inv._id}`)}>
                    <div>
                      <strong>{inv.client?.name}</strong>
                      <span className="muted small">{inv.number} · {d < 0 ? `${Math.abs(d)} days late` : d === 0 ? 'due today' : `due in ${d} days`}</span>
                    </div>
                    <div className="right">
                      <strong className="num">{money(inv.balance, cur)}</strong>
                      <StatusBadge status={inv.displayStatus} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head"><h2>Recent invoices</h2></div>
          {data.recent.length === 0 ? (
            <Empty title="No invoices yet" text="Create your first invoice to start tracking payments.">
              <Link to="/invoices/new" className="btn btn-primary">Create invoice</Link>
            </Empty>
          ) : (
            <ul className="list">
              {data.recent.map((inv) => (
                <li key={inv._id} className="list-row clickable" onClick={() => navigate(`/invoices/${inv._id}`)}>
                  <div>
                    <strong>{inv.number}</strong>
                    <span className="muted small">{inv.client?.name} · {fmtDate(inv.issueDate)}</span>
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
          <div className="panel-head"><h2>Top clients</h2><span className="muted small">By amount paid</span></div>
          {data.topClients.length === 0 ? (
            <Empty title="No payments recorded" text="Clients who pay you will be ranked here." />
          ) : (
            <ul className="list">
              {data.topClients.map((c, i) => (
                <li key={c.id} className="list-row clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                  <div>
                    <strong>{c.name}</strong>
                    <span className="muted small">{c.company || 'No company'}</span>
                  </div>
                  <strong className="num">{money(c.paid, cur)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
