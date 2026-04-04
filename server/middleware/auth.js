const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ikke autoriseret' });
  }
  const token = header.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Ugyldig eller udløbet token' });
  }
}

module.exports = requireAuth;
