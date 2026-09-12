const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildTenantStatus } = require('../lib/tenantStatus');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

router.get('/new', requireAuth, (req, res) => {
  res.render('tenants/form', { tenant: null, contract: null, error: null });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, unit, contact, currency, openingBalance, advanceAmount, monthlyRent } = req.body;
  const startDate = parseDateFields(req.body, 'startDate', { fallbackToNow: false });
  const endDate = parseDateFields(req.body, 'endDate', { fallbackToNow: false });

  if (!name || !startDate || !endDate || !monthlyRent) {
    return res.render('tenants/form', {
      tenant: req.body,
      contract: req.body,
      error: 'Name, contract start/end date, and monthly rent are required.',
    });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      unit: unit || null,
      contact: contact || null,
      currency: currency || 'INR',
      openingBalance: openingBalance || 0,
      advanceAmount: advanceAmount || 0,
      contracts: {
        create: {
          startDate,
          endDate,
          monthlyRent,
          status: 'active',
        },
      },
    },
  });

  res.redirect(`/tenants/${tenant.id}`);
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      contracts: { orderBy: { startDate: 'desc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      balanceAdjustments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!tenant) return res.status(404).send('Tenant not found');

  const status = buildTenantStatus(tenant);
  res.render('tenants/detail', { status, tenant });
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return res.status(404).send('Tenant not found');
  res.render('tenants/form', { tenant, contract: null, error: null });
});

router.post('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, unit, contact, currency } = req.body;

  await prisma.tenant.update({
    where: { id },
    data: { name, unit: unit || null, contact: contact || null, currency: currency || 'INR' },
  });

  res.redirect(`/tenants/${id}`);
});

// Opening balance is editable over time as it gets paid down; every change
// is logged so there's a history of adjustments rather than a silent edit.
router.post('/:id/balance-adjustment', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { newValue, note } = req.body;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return res.status(404).send('Tenant not found');

  await prisma.$transaction([
    prisma.balanceAdjustment.create({
      data: {
        tenantId: id,
        oldValue: tenant.openingBalance,
        newValue,
        note: note || null,
      },
    }),
    prisma.tenant.update({
      where: { id },
      data: { openingBalance: newValue },
    }),
  ]);

  res.redirect(`/tenants/${id}`);
});

// Renewing a lease = adding a new contract row, not editing the old one, so
// past rent terms stay in history.
router.post('/:id/contracts', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { monthlyRent } = req.body;
  const startDate = parseDateFields(req.body, 'startDate');
  const endDate = parseDateFields(req.body, 'endDate');

  await prisma.$transaction([
    prisma.contract.updateMany({
      where: { tenantId: id, status: 'active' },
      data: { status: 'expired' },
    }),
    prisma.contract.create({
      data: {
        tenantId: id,
        startDate,
        endDate,
        monthlyRent,
        status: 'active',
      },
    }),
  ]);

  res.redirect(`/tenants/${id}`);
});

// Marks a tenant as vacated and, if confirmed, records the advance as
// returned with today's date.
router.post('/:id/vacate', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { advanceReturned } = req.body;

  await prisma.tenant.update({
    where: { id },
    data: {
      status: 'vacated',
      advanceStatus: advanceReturned === 'yes' ? 'returned' : 'held',
      advanceReturnedDate: advanceReturned === 'yes' ? new Date() : null,
    },
  });

  res.redirect('/');
});

module.exports = router;
