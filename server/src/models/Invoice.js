import mongoose from 'mongoose';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 1 },
    unitPrice: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  method: {
    type: String,
    enum: ['bank_transfer', 'card', 'cash', 'paypal', 'other'],
    default: 'bank_transfer',
  },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' },
});

const invoiceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    number: { type: String, required: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    items: {
      type: [itemSchema],
      validate: [(v) => v.length > 0, 'Add at least one line item'],
    },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    discount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'sent', 'cancelled'], default: 'draft' },
    payments: [paymentSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

invoiceSchema.index({ user: 1, number: 1 }, { unique: true });

invoiceSchema.virtual('subtotal').get(function () {
  return round2(this.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
});
invoiceSchema.virtual('taxAmount').get(function () {
  const taxable = Math.max(this.subtotal - this.discount, 0);
  return round2((taxable * this.taxRate) / 100);
});
invoiceSchema.virtual('total').get(function () {
  return round2(Math.max(this.subtotal - this.discount, 0) + this.taxAmount);
});
invoiceSchema.virtual('amountPaid').get(function () {
  return round2(this.payments.reduce((s, p) => s + p.amount, 0));
});
invoiceSchema.virtual('balance').get(function () {
  return round2(Math.max(this.total - this.amountPaid, 0));
});
invoiceSchema.virtual('displayStatus').get(function () {
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'draft') return 'draft';
  if (this.total > 0 && this.balance <= 0) return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (this.dueDate < today && this.balance > 0) return 'overdue';
  if (this.amountPaid > 0) return 'partial';
  return 'sent';
});

export default mongoose.model('Invoice', invoiceSchema);
