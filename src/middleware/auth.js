function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = { requireAuth };
