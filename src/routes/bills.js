const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildBillStatus } = require('../lib/billStatus');
const { groupByCurrency } = require('../lib/currency');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const bills = await prisma.bill.findMany({
    where: { status: 'active' },
    include: { payments: true },
    orderBy: { name: 'asc' },
  });
  const statuses = bills.map((b) => buildBillStatus(b));
  const totalsByCurrency = groupByCurrency(
    statuses,
    (s) => s.bill.currency,
    (s) => ({ expected: s.expected, paid: s.paidThisPeriod, outstanding: s.outstanding })
  );
  res.render('bills/list', { statuses, totalsByCurrency, username: req.session.username });
});

router.get('/new', requireAuth, (req, res) => {
  res.render('bills/form', { bill: null, error: null });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, category, currency, amount, frequency, dueDay, notes } = req.body;
  if (!name || !amount) {
    return res.render('bills/form', { bill: req.body, error: 'Name and amount are required.' });
  }
  await prisma.bill.create({
    data: {
      name,
      category: category || null,
      currency: currency || 'INR',
      amount,
      frequency: frequency || 'monthly',
      dueDay: dueDay ? parseInt(dueDay, 10) : null,
      dueDate: frequency === 'one-time' ? parseDateFields(req.body, 'dueDate') : null,
      notes: notes || null,
    },
  });
  res.redirect('/bills');
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { payments: { orderBy: { paidDate: 'desc' } } },
  });
  if (!bill) return res.status(404).send('Bill not found');
  const status = buildBillStatus(bill);
  res.render('bills/detail', { status, bill });
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) return res.status(404).send('Bill not found');
  res.render('bills/form', { bill, error: null });
});

router.post('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, category, currency, amount, frequency, dueDay, notes } = req.body;
  await prisma.bill.update({
    where: { id },
    data: {
      name,
      category: category || null,
      currency: currency || 'INR',
      amount,
      frequency: frequency || 'monthly',
      dueDay: dueDay ? parseInt(dueDay, 10) : null,
      dueDate: frequency === 'one-time' ? parseDateFields(req.body, 'dueDate') : null,
      notes: notes || null,
    },
  });
  res.redirect(`/bills/${id}`);
});

router.post('/:id/payments', requireAuth, async (req, res) => {
  const billId = parseInt(req.params.id, 10);
  const { amount, forPeriod, method, notes } = req.body;
  if (!amount) return res.redirect(`/bills/${billId}`);
  await prisma.billPayment.create({
    data: {
      billId,
      amount,
      forPeriod: forPeriod || null,
      paidDate: parseDateFields(req.body, 'paidDate'),
      method: method || null,
      notes: notes || null,
    },
  });
  res.redirect(`/bills/${billId}`);
});

router.post('/:id/close', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.bill.update({ where: { id }, data: { status: 'closed' } });
  res.redirect('/bills');
});

module.exports = router;
