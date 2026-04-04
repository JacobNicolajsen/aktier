const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const funds = db.all('SELECT * FROM funds ORDER BY name ASC');
  res.json(funds);
});

router.get('/:id', (req, res) => {
  const fund = db.get('SELECT * FROM funds WHERE id = ?', [req.params.id]);
  if (!fund) return res.status(404).json({ error: 'Fond ikke fundet' });
  res.json(fund);
});

router.post('/', (req, res) => {
  const { ticker, name } = req.body;
  if (!ticker || !name) {
    return res.status(400).json({ error: 'ticker og name er påkrævet' });
  }
  try {
    db.run('INSERT INTO funds (ticker, name) VALUES (?, ?)', [
      ticker.toUpperCase().trim(),
      name.trim(),
    ]);
    const fund = db.get('SELECT * FROM funds WHERE ticker = ?', [ticker.toUpperCase().trim()]);
    res.status(201).json(fund);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Ticker ${ticker} findes allerede` });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name er påkrævet' });
  db.run('UPDATE funds SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
  const fund = db.get('SELECT * FROM funds WHERE id = ?', [req.params.id]);
  if (!fund) return res.status(404).json({ error: 'Fond ikke fundet' });
  res.json(fund);
});

router.delete('/:id', (req, res) => {
  const row = db.get('SELECT COUNT(*) as count FROM transactions WHERE fund_id = ?', [req.params.id]);
  if (row.count > 0) {
    return res.status(409).json({ error: 'Kan ikke slette fond med eksisterende transaktioner' });
  }
  db.run('DELETE FROM funds WHERE id = ?', [req.params.id]);
  res.json({ message: 'Fond slettet' });
});

module.exports = router;
