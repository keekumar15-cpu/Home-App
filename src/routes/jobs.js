const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildJobStatus } = require('../lib/jobStatus');
const { parseDateFields } = require('../lib/dateFields');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const jobs = await prisma.job.findMany({
    where: { status: 'pending' },
    orderBy: { targetDate: 'asc' },
  });
  const statuses = jobs.map((j) => buildJobStatus(j));

  const totals = statuses.reduce(
    (acc, s) => {
      acc.total += 1;
      if (s.overdue) acc.overdue += 1;
      else if (s.reminderDue) acc.reminderDue += 1;
      return acc;
    },
    { total: 0, overdue: 0, reminderDue: 0 }
  );

  res.render('jobs/list', { statuses, totals, username: req.session.username });
});

router.post('/', requireAuth, async (req, res) => {
  const { title, category, notes } = req.body;
  const hasReminder = req.body.reminderDate_day && req.body.reminderDate_month && req.body.reminderDate_year;
  if (!title) return res.redirect('/jobs');

  await prisma.job.create({
    data: {
      title,
      category: category || null,
      targetDate: parseDateFields(req.body, 'targetDate'),
      reminderDate: hasReminder ? parseDateFields(req.body, 'reminderDate') : null,
      notes: notes || null,
    },
  });
  res.redirect('/jobs');
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return res.status(404).send('Job not found');
  res.render('jobs/edit', { job, error: null });
});

router.post('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, category, notes } = req.body;
  const hasReminder = req.body.reminderDate_day && req.body.reminderDate_month && req.body.reminderDate_year;

  await prisma.job.update({
    where: { id },
    data: {
      title,
      category: category || null,
      targetDate: parseDateFields(req.body, 'targetDate'),
      reminderDate: hasReminder ? parseDateFields(req.body, 'reminderDate') : null,
      notes: notes || null,
    },
  });
  res.redirect('/jobs');
});

router.post('/:id/done', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.job.update({ where: { id }, data: { status: 'done' } });
  res.redirect('/jobs');
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.job.delete({ where: { id } });
  res.redirect('/jobs');
});

module.exports = router;
