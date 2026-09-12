const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { groupByCurrency } = require('../lib/currency');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/', requireAuth, async (req, res) => {
  const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
  const now = new Date();
  const thisMonthKey = monthKey(now);
  const thisYear = String(now.getFullYear());

  const totalsByCurrency = groupByCurrency(
    expenses,
    (e) => e.currency,
    (e) => {
      const amt = Number(e.amount);
      const d = new Date(e.date);
      return {
        thisMonth: monthKey(d) === thisMonthKey ? amt : 0,
        thisYear: String(d.getFullYear()) === thisYear ? amt : 0,
        allTime: amt,
      };
    }
  );

  res.render('expenses/list', { expenses, totalsByCurrency, username: req.session.username });
});

router.post('/', requireAuth, async (req, res) => {
  const { category, currency, description, amount, notes } = req.body;
  if (!description || !amount) return res.redirect('/expenses');
  await prisma.expense.create({
    data: {
      date: parseDateFields(req.body, 'date'),
      category: category || null,
      currency: currency || 'INR',
      description,
      amount,
      notes: notes || null,
    },
  });
  res.redirect('/expenses');
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return res.status(404).send('Expense not found');
  res.render('expenses/edit', { expense, error: null });
});

router.post('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { category, currency, description, amount, notes } = req.body;
  await prisma.expense.update({
    where: { id },
    data: {
      date: parseDateFields(req.body, 'date'),
      category: category || null,
      currency: currency || 'INR',
      description,
      amount,
      notes: notes || null,
    },
  });
  res.redirect('/expenses');
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.expense.delete({ where: { id } });
  res.redirect('/expenses');
});

module.exports = router;
