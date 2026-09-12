const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildTenantStatus, currentMonthKey } = require('../lib/tenantStatus');
const { groupByCurrency } = require('../lib/currency');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    include: { contracts: true, payments: true },
    orderBy: { name: 'asc' },
  });

  const statuses = tenants.map((t) => buildTenantStatus(t));

  const totalsByCurrency = groupByCurrency(
    statuses,
    (s) => s.tenant.currency,
    (s) => ({
      expected: s.expected,
      received: s.receivedThisMonth,
      outstanding: s.outstanding,
      advanceHeld: s.advanceStatus === 'held' ? s.advanceAmount : 0,
    })
  );

  res.render('dashboard', {
    statuses,
    totalsByCurrency,
    monthKey: currentMonthKey(),
    username: req.session.username,
  });
});

module.exports = router;
