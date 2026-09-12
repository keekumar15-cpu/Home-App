function buildLoanStatus(loan) {
  const principal = Number(loan.principal);
  const repaid = loan.repayments.reduce((sum, r) => sum + Number(r.amount), 0);
  const outstanding = Math.max(principal - repaid, 0);
  const closed = loan.status === 'closed';
  const fullyRepaid = outstanding <= 0;

  let color = 'green';
  if (closed) color = 'gray';
  else if (outstanding > 0) color = 'amber';

  return { loan, principal, repaid, outstanding, closed, fullyRepaid, color };
}

module.exports = { buildLoanStatus };
