const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();

// Every account listed here has the same full access — there are no
// separate roles in this app. Each account is a username/password pair
// read from its own pair of environment variables.
function accounts() {
  const list = [];
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH) {
    list.push({ username: process.env.ADMIN_USERNAME, hash: process.env.ADMIN_PASSWORD_HASH });
  }
  if (process.env.ACCOUNT2_USERNAME && process.env.ACCOUNT2_PASSWORD_HASH) {
    list.push({ username: process.env.ACCOUNT2_USERNAME, hash: process.env.ACCOUNT2_PASSWORD_HASH });
  }
  if (process.env.ACCOUNT3_USERNAME && process.env.ACCOUNT3_PASSWORD_HASH) {
    list.push({ username: process.env.ACCOUNT3_USERNAME, hash: process.env.ACCOUNT3_PASSWORD_HASH });
  }
  return list;
}

router.get('/login', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const list = accounts();

  if (list.length === 0) {
    return res.render('login', { error: 'Server is not configured with any login credentials yet.' });
  }

  const match = list.find((a) => a.username.toLowerCase() === (username || '').toLowerCase());
  const validPass = match && (await bcrypt.compare(password || '', match.hash));

  if (!match || !validPass) {
    return res.render('login', { error: 'Incorrect username or password.' });
  }

  req.session.isAuthenticated = true;
  req.session.username = match.username;
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
