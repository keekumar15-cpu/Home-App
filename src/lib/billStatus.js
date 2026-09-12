function currentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Builds the display status for one bill: whether it's paid for the current
// period, the outstanding amount, and a color key for the card.
function buildBillStatus(bill, today = new Date()) {
  const monthKey = currentMonthKey(today);
  const expected = Number(bill.amount);

  let paidThisPeriod = 0;
  let periodLabel = monthKey;

  if (bill.frequency === 'one-time') {
    paidThisPeriod = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    periodLabel = 'one-time';
  } else if (bill.frequency === 'yearly') {
    const yearKey = String(today.getFullYear());
    paidThisPeriod = bill.payments
      .filter((p) => (p.forPeriod || '').startsWith(yearKey))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    periodLabel = yearKey;
  } else {
    paidThisPeriod = bill.payments
      .filter((p) => p.forPeriod === monthKey)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const outstanding = Math.max(expected - paidThisPeriod, 0);
  const dueDay = bill.dueDay || 5;
  const pastDue = bill.frequency !== 'one-time'
    ? today.getDate() > dueDay
    : bill.dueDate
      ? new Date(bill.dueDate) < today
      : false;

  const closed = bill.status === 'closed';
  const fullyPaid = outstanding <= 0 && (bill.frequency !== 'one-time' || paidThisPeriod > 0);

  let color = 'green';
  if (closed) color = 'gray';
  else if (!fullyPaid && pastDue) color = 'red';
  else if (!fullyPaid) color = 'amber';

  return { bill, monthKey, periodLabel, expected, paidThisPeriod, outstanding, pastDue, closed, fullyPaid, color };
}

module.exports = { buildBillStatus, currentMonthKey };
