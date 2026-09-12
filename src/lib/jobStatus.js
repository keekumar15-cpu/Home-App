function buildJobStatus(job, today = new Date()) {
  const done = job.status === 'done';
  const overdue = !done && new Date(job.targetDate) < today;
  const reminderDue = !done && !overdue && job.reminderDate && new Date(job.reminderDate) <= today;

  let color = 'green';
  if (done) color = 'gray';
  else if (overdue) color = 'red';
  else if (reminderDue) color = 'amber';

  return { job, done, overdue, reminderDue, color };
}

module.exports = { buildJobStatus };
