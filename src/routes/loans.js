const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildLoanStatus } = require('../lib/loanStatus');
const { groupByCurrency } = require('../lib/currency');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const loans = await prisma.loan.findMany({
    where: { status: 'active' },
    include: { repayments: true },
    orderBy: { borrowerName: 'asc' },
  });
  const statuses = loans.map((l) => buildLoanStatus(l));
  const totalsByCurrency = groupByCurrency(
    statuses,
    (s) => s.loan.currency,
    (s) => ({ principal: s.principal, repaid: s.repaid, outstanding: s.outstanding })
  );
  res.render('loans/list', { statuses, totalsByCurrency, username: req.session.username });
});

router.get('/new', requireAuth, (req, res) => {
  res.render('loans/form', { loan: null, error: null });
});

router.post('/', requireAuth, async (req, res) => {
  const { borrowerName, contact, currency, principal, interestRate, notes } = req.body;
  const dateGiven = parseDateFields(req.body, 'dateGiven', { fallbackToNow: false });
  if (!borrowerName || !principal || !dateGiven) {
    return res.render('loans/form', { loan: req.body, error: 'Borrower name, principal, and date given are required.' });
  }
  await prisma.loan.create({
    data: {
      borrowerName,
      contact: contact || null,
      currency: currency || 'INR',
      principal,
      dateGiven,
      interestRate: interestRate || 0,
      notes: notes || null,
    },
  });
  res.redirect('/loans');
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { repayments: { orderBy: { date: 'desc' } } },
  });
  if (!loan) return res.status(404).send('Loan not found');
  const status = buildLoanStatus(loan);
  res.render('loans/detail', { status, loan });
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) return res.status(404).send('Loan not found');
  res.render('loans/form', { loan, error: null });
});

router.post('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { borrowerName, contact, currency, principal, interestRate, notes } = req.body;
  const dateGiven = parseDateFields(req.body, 'dateGiven');
  await prisma.loan.update({
    where: { id },
    data: {
      borrowerName,
      contact: contact || null,
      currency: currency || 'INR',
      principal,
      dateGiven,
      interestRate: interestRate || 0,
      notes: notes || null,
    },
  });
  res.redirect(`/loans/${id}`);
});

router.post('/:id/repayments', requireAuth, async (req, res) => {
  const loanId = parseInt(req.params.id, 10);
  const { amount, notes } = req.body;
  if (!amount) return res.redirect(`/loans/${loanId}`);
  await prisma.loanRepayment.create({
    data: {
      loanId,
      amount,
      date: parseDateFields(req.body, 'date'),
      notes: notes || null,
    },
  });
  res.redirect(`/loans/${loanId}`);
});

router.post('/:id/close', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.loan.update({ where: { id }, data: { status: 'closed' } });
  res.redirect('/loans');
});

module.exports = router;
