require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const tenantRoutes = require('./routes/tenants');
const paymentRoutes = require('./routes/payments');
const billRoutes = require('./routes/bills');
const loanRoutes = require('./routes/loans');
const expenseRoutes = require('./routes/expenses');
const claimRoutes = require('./routes/claims');
const jobRoutes = require('./routes/jobs');
const { formatMoney, CURRENCY_CODES } = require('./lib/currency');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust the reverse proxy (Traefik) in front of this app so Express
// correctly reports req.secure based on X-Forwarded-Proto.
app.set('trust proxy', 1);

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Available to every EJS template without passing them explicitly on each render.
app.locals.formatMoney = formatMoney;
app.locals.CURRENCY_CODES = CURRENCY_CODES;

app.use(
  session({
    store: new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'change-me-in-.env',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.username = req.session ? req.session.username : undefined;
  next();
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/tenants', tenantRoutes);
app.use('/tenants', paymentRoutes);
app.use('/bills', billRoutes);
app.use('/loans', loanRoutes);
app.use('/expenses', expenseRoutes);
app.use('/claims', claimRoutes);
app.use('/jobs', jobRoutes);

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Rent tracker listening on port ${PORT}`);
});
