import { Router } from 'express';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { asyncHandler, protect } from '../middleware/auth.js';
import { buildInvoicePdf } from '../utils/invoicePdf.js';

const router = Router();
router.use(protect);

const populate = { path: 'client', select: 'name company email phone address' };
const findOwned = (req) => Invoice.findOne({ _id: req.params.id, user: req.user._id }).populate(populate);

const clean = (b) => {
  const out = {};
  if (b.client) out.client = b.client;
  if (b.issueDate) out.issueDate = b.issueDate;
  if (b.dueDate) out.dueDate = b.dueDate;
  if (Array.isArray(b.items)) {
    out.items = b.items
      .filter((i) => i.description && i.description.trim())
      .map((i) => ({
        description: i.description,
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
      }));
  }
  if (b.taxRate !== undefined) out.taxRate = Number(b.taxRate) || 0;
  if (b.discount !== undefined) out.discount = Number(b.discount) || 0;
  if (b.notes !== undefined) out.notes = b.notes;
  if (['draft', 'sent', 'cancelled'].includes(b.status)) out.status = b.status;
  return out;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, client, search = '' } = req.query;
    const filter = { user: req.user._id };
    if (client) filter.client = client;
    let invoices = await Invoice.find(filter).populate(populate).sort({ issueDate: -1, createdAt: -1 });

    const counts = { all: invoices.length, draft: 0, sent: 0, partial: 0, overdue: 0, paid: 0, cancelled: 0 };
    invoices.forEach((i) => (counts[i.displayStatus] += 1));

    if (status && status !== 'all') invoices = invoices.filter((i) => i.displayStatus === status);
    if (search) {
      const q = search.toLowerCase();
      invoices = invoices.filter(
        (i) =>
          i.number.toLowerCase().includes(q) ||
          i.client?.name?.toLowerCase().includes(q) ||
          i.client?.company?.toLowerCase().includes(q)
      );
    }
    res.json({ invoices, counts });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = clean(req.body);
    const client = await Client.findOne({ _id: data.client, user: req.user._id });
    if (!client) return res.status(400).json({ message: 'Choose a client for this invoice.' });

    const biz = req.user.business;
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = data.dueDate
      ? new Date(data.dueDate)
      : new Date(issueDate.getTime() + (biz.paymentTerms ?? 14) * 86400000);

    // Atomically reserve the next invoice number
    const before = await User.findByIdAndUpdate(req.user._id, { $inc: { 'business.nextNumber': 1 } });
    const number = `${before.business.invoicePrefix}-${before.business.nextNumber}`;

    const invoice = await Invoice.create({
      taxRate: biz.taxRate,
      ...data,
      issueDate,
      dueDate,
      number,
      user: req.user._id,
    });
    await invoice.populate(populate);
    res.status(201).json(invoice);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await findOwned(req);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json(invoice);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await findOwned(req);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    const data = clean(req.body);
    if (data.client && String(data.client) !== String(invoice.client._id)) {
      const owned = await Client.findOne({ _id: data.client, user: req.user._id });
      if (!owned) return res.status(400).json({ message: 'Choose a valid client.' });
    }
    Object.assign(invoice, data);
    await invoice.save();
    await invoice.populate(populate);
    res.json(invoice);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json({ message: 'Invoice deleted.' });
  })
);

router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const invoice = await findOwned(req);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ message: 'This invoice is cancelled and cannot take payments.' });
    }
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Enter a payment amount greater than zero.' });
    if (amount > invoice.balance + 0.001) {
      return res.status(400).json({ message: `The amount is higher than the remaining balance (${invoice.balance.toFixed(2)}).` });
    }
    invoice.payments.push({
      amount,
      method: req.body.method || 'bank_transfer',
      date: req.body.date || new Date(),
      note: req.body.note || '',
    });
    if (invoice.status === 'draft') invoice.status = 'sent';
    await invoice.save();
    res.status(201).json(invoice);
  })
);

router.delete(
  '/:id/payments/:paymentId',
  asyncHandler(async (req, res) => {
    const invoice = await findOwned(req);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    invoice.payments.pull({ _id: req.params.paymentId });
    await invoice.save();
    res.json(invoice);
  })
);

router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const invoice = await findOwned(req);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    buildInvoicePdf(invoice, req.user.business, res);
  })
);

export default router;
