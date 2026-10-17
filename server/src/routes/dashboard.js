import { Router } from 'express';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import { asyncHandler, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [invoices, clients] = await Promise.all([
      Invoice.find({ user: req.user._id }).populate('client', 'name company').sort({ issueDate: -1 }),
      Client.find({ user: req.user._id }).select('status'),
    ]);

    const now = new Date();
    const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;
    const thisMonth = monthKey(now);
    const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    // Last 6 months of collected revenue
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), month: MONTHS[d.getMonth()], revenue: 0 });
    }

    let collectedThisMonth = 0;
    let collectedLastMonth = 0;
    let collectedYear = 0;
    let awaiting = 0;
    let overdue = 0;
    let overdueCount = 0;
    const statusCounts = { draft: 0, sent: 0, partial: 0, overdue: 0, paid: 0, cancelled: 0 };
    const perClient = {};

    invoices.forEach((inv) => {
      statusCounts[inv.displayStatus] += 1;
      inv.payments.forEach((p) => {
        const k = monthKey(new Date(p.date));
        if (k === thisMonth) collectedThisMonth += p.amount;
        if (k === lastMonth) collectedLastMonth += p.amount;
        if (new Date(p.date).getFullYear() === now.getFullYear()) collectedYear += p.amount;
        const bucket = months.find((m) => m.key === k);
        if (bucket) bucket.revenue += p.amount;
        if (inv.client) {
          const id = String(inv.client._id);
          perClient[id] = perClient[id] || { id, name: inv.client.name, company: inv.client.company, paid: 0 };
          perClient[id].paid += p.amount;
        }
      });
      if (inv.displayStatus === 'overdue') {
        overdue += inv.balance;
        overdueCount += 1;
      } else if (['sent', 'partial'].includes(inv.displayStatus)) {
        awaiting += inv.balance;
      }
    });

    const attention = invoices
      .filter((i) => ['overdue', 'sent', 'partial'].includes(i.displayStatus))
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 6);

    res.json({
      collectedThisMonth: round2(collectedThisMonth),
      collectedLastMonth: round2(collectedLastMonth),
      collectedYear: round2(collectedYear),
      awaiting: round2(awaiting),
      overdue: round2(overdue),
      overdueCount,
      clients: {
        total: clients.length,
        active: clients.filter((c) => c.status === 'active').length,
        leads: clients.filter((c) => c.status === 'lead').length,
      },
      monthly: months.map(({ month, revenue }) => ({ month, revenue: round2(revenue) })),
      statusCounts,
      attention,
      recent: invoices.slice(0, 5),
      topClients: Object.values(perClient)
        .sort((a, b) => b.paid - a.paid)
        .slice(0, 5)
        .map((c) => ({ ...c, paid: round2(c.paid) })),
    });
  })
);

export default router;
