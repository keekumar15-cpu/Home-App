const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

router.post('/:tenantId/payments', requireAuth, async (req, res) => {
  const tenantId = parseInt(req.params.tenantId, 10);
  const { amount, forMonth, method, notes } = req.body;

  if (!amount || !forMonth) {
    return res.redirect(`/tenants/${tenantId}`);
  }

  await prisma.payment.create({
    data: {
      tenantId,
      amount,
      forMonth,
      paymentDate: parseDateFields(req.body, 'paymentDate'),
      method: method || null,
      notes: notes || null,
    },
  });

  res.redirect(`/tenants/${tenantId}`);
});

router.get('/:tenantId/payments/:id/edit', requireAuth, async (req, res) => {
  const tenantId = parseInt(req.params.tenantId, 10);
  const id = parseInt(req.params.id, 10);
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.tenantId !== tenantId) return res.status(404).send('Payment not found');
  res.render('tenants/payment-edit', { tenantId, payment, error: null });
});

router.post('/:tenantId/payments/:id', requireAuth, async (req, res) => {
  const tenantId = parseInt(req.params.tenantId, 10);
  const id = parseInt(req.params.id, 10);
  const { amount, forMonth, method, notes } = req.body;

  if (!amount || !forMonth) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    return res.render('tenants/payment-edit', {
      tenantId,
      payment: { ...payment, ...req.body },
      error: 'Amount and month are required.',
    });
  }

  await prisma.payment.update({
    where: { id },
    data: {
      amount,
      forMonth,
      paymentDate: parseDateFields(req.body, 'paymentDate'),
      method: method || null,
      notes: notes || null,
    },
  });

  res.redirect(`/tenants/${tenantId}`);
});

router.post('/:tenantId/payments/:id/delete', requireAuth, async (req, res) => {
  const tenantId = parseInt(req.params.tenantId, 10);
  const id = parseInt(req.params.id, 10);
  await prisma.payment.delete({ where: { id } });
  res.redirect(`/tenants/${tenantId}`);
});

module.exports = router;
