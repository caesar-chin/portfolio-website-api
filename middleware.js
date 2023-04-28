function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.session.accessToken) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

module.exports = {
  ensureAuthenticated,
};
