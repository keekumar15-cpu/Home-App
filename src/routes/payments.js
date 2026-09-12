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

module.exports = router;
