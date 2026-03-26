const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.fullUser || !allowedRoles.includes(req.fullUser.role)) {
      return res.status(403).json({ message: "Access denied for this role" });
    }
    next();
  };
};

module.exports = roleMiddleware;
