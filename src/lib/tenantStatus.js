const DUE_DAY = parseInt(process.env.RENT_DUE_DAY || '5', 10);

function currentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function pickActiveContract(contracts, today = new Date()) {
  if (!contracts || contracts.length === 0) return null;
  // Prefer a contract whose date range covers today; otherwise the most
  // recently started one (so an expired lease still shows its last terms
  // until a renewal is entered).
  const covering = contracts.find(
    (c) => new Date(c.startDate) <= today && new Date(c.endDate) >= today
  );
  if (covering) return covering;
  return [...contracts].sort(
    (a, b) => new Date(b.startDate) - new Date(a.startDate)
  )[0];
}

// Builds the display status for one tenant: active contract, this month's
// expected/received/outstanding, overdue flag, contract-expired flag, and
// a color key the dashboard template uses for the card border/badge.
function buildTenantStatus(tenant, today = new Date()) {
  const monthKey = currentMonthKey(today);
  const contract = pickActiveContract(tenant.contracts, today);

  const expected = contract ? Number(contract.monthlyRent) : 0;
  const receivedThisMonth = tenant.payments
    .filter((p) => p.forMonth === monthKey)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Math.max(expected - receivedThisMonth, 0);

  const contractExpired = contract ? new Date(contract.endDate) < today : true;
  const pastDueDay = today.getDate() > DUE_DAY;
  const overdue = !contractExpired && outstanding > 0 && pastDueDay;

  let color = 'green';
  if (contractExpired) color = 'gray';
  else if (overdue) color = 'red';
  else if (outstanding > 0) color = 'amber';

  return {
    tenant,
    contract,
    monthKey,
    expected,
    receivedThisMonth,
    outstanding,
    contractExpired,
    overdue,
    color,
    openingBalance: Number(tenant.openingBalance),
    advanceAmount: Number(tenant.advanceAmount),
    advanceStatus: tenant.advanceStatus,
  };
}

module.exports = { buildTenantStatus, currentMonthKey, pickActiveContract, DUE_DAY };
