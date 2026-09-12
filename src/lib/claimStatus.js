// Flags a pending claim that's been sitting a while as needing follow-up,
// rather than treating every pending claim the same.
const STALE_AFTER_DAYS = 30;

function buildClaimStatus(claim, today = new Date()) {
  const claimed = claim.status === 'claimed';
  const daysSinceIncurred = Math.floor((today - new Date(claim.dateIncurred)) / (1000 * 60 * 60 * 24));
  const stale = !claimed && daysSinceIncurred > STALE_AFTER_DAYS;

  let color = 'amber'; // pending, within normal follow-up window
  if (claimed) color = 'green';
  else if (stale) color = 'red';

  return { claim, claimed, stale, daysSinceIncurred, color };
}

module.exports = { buildClaimStatus, STALE_AFTER_DAYS };
