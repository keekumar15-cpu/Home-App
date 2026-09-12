const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildClaimStatus } = require('../lib/claimStatus');
const { groupByCurrency } = require('../lib/currency');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const claims = await prisma.claim.findMany({ orderBy: { dateIncurred: 'desc' } });
  const statuses = claims.map((c) => buildClaimStatus(c));

  const totalsByCurrency = groupByCurrency(
    statuses,
    (s) => s.claim.currency,
    (s) => ({
      pending: s.claimed ? 0 : Number(s.claim.amount),
      claimed: s.claimed ? Number(s.claim.claimedAmount ?? s.claim.amount) : 0,
    })
  );

  res.render('claims/list', { statuses, totalsByCurrency, username: req.session.username });
});

router.get('/new', requireAuth, (req, res) => {
  res.render('claims/form', { claim: null, error: null });
});

router.post('/', requireAuth, async (req, res) => {
  const { description, category, currency, amount, notes } = req.body;
  if (!description || !amount) {
    return res.render('claims/form', { claim: req.body, error: 'Description and amount are required.' });
  }
  await prisma.claim.create({
    data: {
      description,
      category: category || null,
      currency: currency || 'INR',
      amount,
      dateIncurred: parseDateFields(req.body, 'dateIncurred'),
      notes: notes || null,
    },
  });
  res.redirect('/claims');
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return res.status(404).send('Claim not found');
  const status = buildClaimStatus(claim);
  res.render('claims/detail', { status, claim });
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return res.status(404).send('Claim not found');
  res.render('claims/form', { claim, error: null });
});

router.post('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { description, category, currency, amount, notes } = req.body;
  await prisma.claim.update({
    where: { id },
    data: {
      description,
      category: category || null,
      currency: currency || 'INR',
      amount,
      dateIncurred: parseDateFields(req.body, 'dateIncurred'),
      notes: notes || null,
    },
  });
  res.redirect(`/claims/${id}`);
});

// Logs the claim as settled — the one-time "claimed" event, with the date
// and amount actually received (which can differ slightly from what was
// originally claimed).
router.post('/:id/claim', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { claimedAmount } = req.body;
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) return res.status(404).send('Claim not found');

  await prisma.claim.update({
    where: { id },
    data: {
      status: 'claimed',
      claimedDate: parseDateFields(req.body, 'claimedDate'),
      claimedAmount: claimedAmount || claim.amount,
    },
  });
  res.redirect(`/claims/${id}`);
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.claim.delete({ where: { id } });
  res.redirect('/claims');
});

module.exports = router;
