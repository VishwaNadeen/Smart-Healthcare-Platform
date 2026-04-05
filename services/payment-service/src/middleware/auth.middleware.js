const fetch = require('node-fetch');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const response = await fetch(
      `${process.env.AUTH_SERVICE_URL}/api/auth/me`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const data = await response.json();
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Auth service unavailable' });
  }
};

module.exports = { requireAuth };