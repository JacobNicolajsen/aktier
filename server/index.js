const express = require('express');
const cors = require('cors');
const path = require('path');
const { startScheduler, exportToJson } = require('./services/backup');
const requireAuth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Strip /aktier prefix when running behind cPanel Passenger at a subpath
app.use((req, _res, next) => {
  if (req.url.startsWith('/aktier')) {
    req.url = req.url.slice('/aktier'.length) || '/';
  }
  next();
});

// Auth (åbne endpoints — ingen token krævet)
app.use('/api/auth', require('./routes/auth'));

// Alle øvrige API-endpoints kræver gyldigt JWT
app.use('/api/funds',        requireAuth, require('./routes/funds'));
app.use('/api/transactions', requireAuth, require('./routes/transactions'));
app.use('/api/holdings',     requireAuth, require('./routes/holdings'));
app.use('/api/gains',        requireAuth, require('./routes/gains'));
app.use('/api/monthly',      requireAuth, require('./routes/monthly'));
app.use('/api/prices',       requireAuth, require('./routes/prices'));
app.use('/api/dividends',    requireAuth, require('./routes/dividends'));

app.post('/api/backup', requireAuth, (req, res) => {
  try {
    const filepath = exportToJson();
    res.json({ message: 'Backup oprettet', file: path.basename(filepath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend (production build)
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server kører på http://localhost:${PORT}`);
  startScheduler();
});
