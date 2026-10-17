import PDFDocument from 'pdfkit';

const INK = '#14202B';
const MUTED = '#6B7780';
const ACCENT = '#1F8A70';
const LINE = '#DDE3E1';

export function buildInvoicePdf(invoice, business, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  const currency = business.currency || 'USD';
  const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  const date = (d) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const left = 50;
  const right = doc.page.width - 50;
  const width = right - left;

  // Top accent rule
  doc.rect(0, 0, doc.page.width, 10).fill(ACCENT);

  // Business block
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(business.name || 'Your business', left, 44, { width: 280 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  [business.address, business.email, business.phone].filter(Boolean).forEach((line) => doc.text(line, { width: 280 }));

  // Invoice meta
  doc.font('Helvetica-Bold').fontSize(26).fillColor(ACCENT).text('Invoice', left, 44, { width, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(invoice.number, left, 76, { width, align: 'right' });
  doc.fontSize(9).fillColor(MUTED).text(invoice.displayStatus.toUpperCase(), left, 92, { width, align: 'right' });

  // Bill to + dates
  let y = 160;
  doc.moveTo(left, y - 12).lineTo(right, y - 12).strokeColor(LINE).lineWidth(1).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('Billed to', left, y);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(invoice.client?.name || '', left, y + 14, { width: 260 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  [invoice.client?.company, invoice.client?.address, invoice.client?.email].filter(Boolean).forEach((l) => doc.text(l, { width: 260 }));

  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('Issued', 340, y);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(date(invoice.issueDate), 340, y + 14);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('Due', 450, y);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(date(invoice.dueDate), 450, y + 14);

  // Table header
  y = 260;
  const col = { desc: left, qty: 340, rate: 400, amount: 470 };
  doc.rect(left, y, width, 24).fill('#F1F5F3');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
  doc.text('Description', col.desc + 8, y + 8, { width: 270 });
  doc.text('Qty', col.qty, y + 8, { width: 50, align: 'right' });
  doc.text('Rate', col.rate, y + 8, { width: 60, align: 'right' });
  doc.text('Amount', col.amount, y + 8, { width: right - col.amount - 8, align: 'right' });
  y += 32;

  invoice.items.forEach((item) => {
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    const h = doc.heightOfString(item.description, { width: 270 });
    doc.font('Helvetica').fontSize(10).fillColor(INK);
    doc.text(item.description, col.desc + 8, y, { width: 270 });
    doc.text(String(item.quantity), col.qty, y, { width: 50, align: 'right' });
    doc.text(money(item.unitPrice), col.rate, y, { width: 60, align: 'right' });
    doc.text(money(item.quantity * item.unitPrice), col.amount, y, { width: right - col.amount - 8, align: 'right' });
    y += Math.max(h, 14) + 10;
    doc.moveTo(left, y - 5).lineTo(right, y - 5).strokeColor(LINE).lineWidth(0.5).stroke();
  });

  // Totals
  if (y > 620) {
    doc.addPage();
    y = 60;
  }
  y += 10;
  const labelX = 340;
  const valueW = right - 8 - 450;
  const row = (label, value, opts = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10).fillColor(opts.color || INK);
    doc.text(label, labelX, y, { width: 100 });
    doc.text(value, 450, y, { width: valueW + 0, align: 'right' });
    y += (opts.size || 10) + 8;
  };
  row('Subtotal', money(invoice.subtotal));
  if (invoice.discount > 0) row('Discount', `- ${money(invoice.discount)}`);
  if (invoice.taxRate > 0) row(`Tax (${invoice.taxRate}%)`, money(invoice.taxAmount));
  doc.moveTo(labelX, y).lineTo(right - 8, y).strokeColor(INK).lineWidth(1).stroke();
  y += 8;
  row('Total', money(invoice.total), { bold: true, size: 13 });
  if (invoice.amountPaid > 0) row('Paid', `- ${money(invoice.amountPaid)}`, { color: MUTED });
  row('Balance due', money(invoice.balance), { bold: true, size: 13, color: ACCENT });

  // Notes
  if (invoice.notes) {
    y += 20;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('Notes', left, y);
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(invoice.notes, left, y + 14, { width: 300 });
  }

  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text('Thank you for your business.', left, 780, { width, align: 'center' });

  doc.end();
}
