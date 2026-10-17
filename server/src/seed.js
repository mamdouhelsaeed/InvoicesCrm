import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Client from './models/Client.js';
import Invoice from './models/Invoice.js';

const day = 86400000;
const ago = (d) => new Date(Date.now() - d * day);

await mongoose.connect(process.env.MONGO_URI );

const old = await User.findOne({ email: 'demo@ledgerly.dev' });
if (old) {
  await Client.deleteMany({ user: old._id });
  await Invoice.deleteMany({ user: old._id });
  await old.deleteOne();
}

const user = await User.create({
  name: 'Demo User',
  email: 'demo@ledgerly.dev',
  password: 'demo1234',
  business: {
    name: 'Northwind Studio',
    email: 'hello@northwind.studio',
    phone: '+1 555 010 2030',
    address: '48 Harbor Street, Portland, OR',
    currency: 'USD',
    taxRate: 8,
    invoicePrefix: 'INV',
    nextNumber: 1001,
    paymentTerms: 14,
  },
});

const clients = await Client.insertMany([
  { user: user._id, name: 'Amelia Hart', company: 'Brightside Dental', email: 'amelia@brightside.com', phone: '+1 555 200 1100', address: '12 Elm Ave, Austin, TX', status: 'active', notes: [{ text: 'Prefers invoices sent on the 1st of each month.' }] },
  { user: user._id, name: 'Jonas Weber', company: 'Weber & Sons Bakery', email: 'jonas@weberbakery.com', phone: '+1 555 200 2200', address: '77 Mill Rd, Denver, CO', status: 'active', notes: [] },
  { user: user._id, name: 'Priya Nair', company: 'Lumen Yoga', email: 'priya@lumenyoga.com', phone: '+1 555 200 3300', address: '5 Lotus Ln, Seattle, WA', status: 'active', notes: [{ text: 'Interested in a website refresh in Q4.' }] },
  { user: user._id, name: 'Marcus Cole', company: 'Cole Logistics', email: 'marcus@colelogistics.com', phone: '+1 555 200 4400', address: '901 Freight Way, Dallas, TX', status: 'lead', notes: [{ text: 'Asked for a quote on a booking portal.' }] },
  { user: user._id, name: 'Sofia Rossi', company: 'Rossi Interiors', email: 'sofia@rossiinteriors.com', phone: '+1 555 200 5500', address: '33 Design Blvd, Miami, FL', status: 'inactive', notes: [] },
]);

const [amelia, jonas, priya, , sofia] = clients;
let n = 1001;
const make = (client, issued, terms, items, status, payments = [], extra = {}) =>
  ({
    user: user._id,
    client: client._id,
    number: `INV-${n++}`,
    issueDate: ago(issued),
    dueDate: ago(issued - terms),
    items,
    taxRate: 8,
    status,
    payments,
    ...extra,
  });

await Invoice.insertMany([
  make(amelia, 150, 14, [{ description: 'Website design', quantity: 1, unitPrice: 2400 }], 'sent', [{ amount: 2592, date: ago(130), method: 'bank_transfer' }]),
  make(jonas, 120, 14, [{ description: 'Brand identity package', quantity: 1, unitPrice: 1800 }], 'sent', [{ amount: 1944, date: ago(100), method: 'card' }]),
  make(priya, 95, 14, [{ description: 'Monthly retainer', quantity: 1, unitPrice: 1200 }], 'sent', [{ amount: 1296, date: ago(80), method: 'bank_transfer' }]),
  make(amelia, 70, 14, [{ description: 'SEO audit', quantity: 1, unitPrice: 900 }, { description: 'Content updates', quantity: 6, unitPrice: 85 }], 'sent', [{ amount: 1522.8, date: ago(55), method: 'paypal' }]),
  make(sofia, 50, 14, [{ description: 'Landing page', quantity: 1, unitPrice: 1500 }], 'sent', [{ amount: 1620, date: ago(35), method: 'bank_transfer' }]),
  make(jonas, 32, 14, [{ description: 'Online ordering setup', quantity: 1, unitPrice: 3200 }], 'sent', [{ amount: 3456, date: ago(15), method: 'bank_transfer' }]),
  make(priya, 28, 14, [{ description: 'Monthly retainer', quantity: 1, unitPrice: 1200 }], 'sent', [{ amount: 600, date: ago(10), method: 'card' }]),
  make(amelia, 22, 14, [{ description: 'Booking widget integration', quantity: 1, unitPrice: 1400 }], 'sent'),
  make(jonas, 8, 14, [{ description: 'Menu photography', quantity: 1, unitPrice: 650 }], 'sent'),
  make(priya, 3, 14, [{ description: 'Monthly retainer', quantity: 1, unitPrice: 1200 }], 'sent', [{ amount: 400, date: ago(1), method: 'bank_transfer' }]),
  make(amelia, 0, 14, [{ description: 'Quarterly maintenance', quantity: 1, unitPrice: 500 }], 'draft'),
]);

await User.updateOne({ _id: user._id }, { 'business.nextNumber': n });

console.log('Seeded. Sign in with demo@ledgerly.dev / demo1234');
await mongoose.disconnect();
