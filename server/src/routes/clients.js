import { Router } from 'express';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import { asyncHandler, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const pick = (body) => {
  const out = {};
  ['name', 'company', 'email', 'phone', 'address', 'status'].forEach((k) => {
    if (body[k] !== undefined) out[k] = body[k];
  });
  return out;
};

const findOwned = (req) => Client.findOne({ _id: req.params.id, user: req.user._id });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '', status } = req.query;
    const filter = { user: req.user._id };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { company: rx }, { email: rx }];
    }
    const [clients, invoices] = await Promise.all([
      Client.find(filter).sort({ createdAt: -1 }),
      Invoice.find({ user: req.user._id, status: { $ne: 'cancelled' } }),
    ]);

    const totals = {};
    invoices.forEach((inv) => {
      if (inv.status === 'draft') return;
      const key = String(inv.client);
      totals[key] = totals[key] || { billed: 0, outstanding: 0, invoices: 0 };
      totals[key].billed += inv.total;
      totals[key].outstanding += inv.balance;
      totals[key].invoices += 1;
    });

    res.json(
      clients.map((c) => ({
        ...c.toObject(),
        billed: totals[c.id]?.billed || 0,
        outstanding: totals[c.id]?.outstanding || 0,
        invoiceCount: totals[c.id]?.invoices || 0,
      }))
    );
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const client = await Client.create({ ...pick(req.body), user: req.user._id });
    res.status(201).json(client);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await findOwned(req);
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    const invoices = await Invoice.find({ user: req.user._id, client: client._id }).sort({ issueDate: -1 });
    res.json({ client, invoices });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await findOwned(req);
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    Object.assign(client, pick(req.body));
    await client.save();
    res.json(client);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await findOwned(req);
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    const count = await Invoice.countDocuments({ user: req.user._id, client: client._id });
    if (count > 0) {
      return res.status(400).json({
        message: `This client has ${count} invoice${count > 1 ? 's' : ''}. Delete them first, or mark the client as inactive.`,
      });
    }
    await client.deleteOne();
    res.json({ message: 'Client deleted.' });
  })
);

router.post(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const client = await findOwned(req);
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    if (!req.body.text?.trim()) return res.status(400).json({ message: 'Write something before saving the note.' });
    client.notes.unshift({ text: req.body.text });
    await client.save();
    res.status(201).json(client);
  })
);

router.delete(
  '/:id/notes/:noteId',
  asyncHandler(async (req, res) => {
    const client = await findOwned(req);
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    client.notes.pull({ _id: req.params.noteId });
    await client.save();
    res.json(client);
  })
);

export default router;
