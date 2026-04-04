const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../auth.json');
const JWT_SECRET = process.env.JWT_SECRET || 'aktier-secret-change-me';
const TOKEN_TTL = '7d';

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

// Er der sat et password endnu?
router.get('/status', (req, res) => {
  const config = readConfig();
  res.json({ configured: !!config?.passwordHash });
});

// Første opsætning — sæt password
router.post('/setup', async (req, res) => {
  const config = readConfig();
  if (config?.passwordHash) {
    return res.status(403).json({ error: 'Password er allerede sat' });
  }
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password skal være mindst 4 tegn' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  writeConfig({ passwordHash });
  res.json({ message: 'Password oprettet' });
});

// Login
router.post('/login', async (req, res) => {
  const config = readConfig();
  if (!config?.passwordHash) {
    return res.status(403).json({ error: 'Ingen konfiguration fundet' });
  }
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password mangler' });
  }
  const match = await bcrypt.compare(password, config.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Forkert password' });
  }
  const token = jwt.sign({ auth: true }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token });
});

// Skift password (kræver gyldigt token — håndteres i middleware)
router.post('/change', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Begge felter er påkrævet' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Nyt password skal være mindst 4 tegn' });
  }
  const config = readConfig();
  const match = await bcrypt.compare(currentPassword, config.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Nuværende password er forkert' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  writeConfig({ passwordHash });
  res.json({ message: 'Password skiftet' });
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
