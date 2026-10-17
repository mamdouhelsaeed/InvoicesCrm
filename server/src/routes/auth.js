import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler, protect } from '../middleware/auth.js';

const router = Router();

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, business: u.business });

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, businessName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const user = await User.create({
      name,
      email,
      password,
      business: { name: businessName || '', email },
    });
    res.status(201).json({ token: sign(user._id), user: publicUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password || ''))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: sign(user._id), user: publicUser(user) });
  })
);

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const { name, business = {} } = req.body;
    const user = req.user;
    if (name) user.name = name;
    const fields = ['name', 'email', 'phone', 'address', 'currency', 'taxRate', 'invoicePrefix', 'paymentTerms'];
    fields.forEach((f) => {
      if (business[f] !== undefined) user.business[f] = business[f];
    });
    await user.save();
    res.json({ user: publicUser(user) });
  })
);

export default router;
