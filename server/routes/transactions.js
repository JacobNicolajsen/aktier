const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { fund_id } = req.query;
  let query = `
    SELECT t.*, f.ticker, f.name as fund_name
    FROM transactions t
    JOIN funds f ON t.fund_id = f.id
  `;
  const params = [];
  if (fund_id) {
    query += ' WHERE t.fund_id = ?';
    params.push(fund_id);
  }
  query += ' ORDER BY t.date DESC, t.created_at DESC';
  res.json(db.all(query, params));
});

router.post('/', (req, res) => {
  const { fund_id, type, date, shares, price_per_share, brokerage = 0, notes } = req.body;

  if (!fund_id || !type || !date || !shares || !price_per_share) {
    return res.status(400).json({ error: 'fund_id, type, date, shares og price_per_share er påkrævet' });
  }
  if (!['buy', 'sell'].includes(type)) {
    return res.status(400).json({ error: 'type skal være buy eller sell' });
  }

  if (type === 'sell') {
    const { calculateHoldings } = require('../utils/holdings');
    const holdings = calculateHoldings();
    const holding = holdings.find((h) => h.fund_id === parseInt(fund_id));
    const currentShares = holding ? holding.shares : 0;
    if (parseFloat(shares) > currentShares + 0.0001) {
      return res.status(400).json({
        error: `Ikke nok aktier. Du har ${currentShares.toFixed(4)} aktier i denne fond`,
      });
    }
  }

  const fund = db.get('SELECT * FROM funds WHERE id = ?', [fund_id]);
  if (!fund) return res.status(404).json({ error: 'Fond ikke fundet' });

  try {
    db.run(
      `INSERT INTO transactions (fund_id, type, date, shares, price_per_share, brokerage, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fund_id, type, date, shares, price_per_share, brokerage, notes || null]
    );
    const tx = db.get(
      `SELECT t.*, f.ticker, f.name as fund_name
       FROM transactions t JOIN funds f ON t.fund_id = f.id
       WHERE t.id = last_insert_rowid()`
    );
    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { date, shares, price_per_share, brokerage, notes } = req.body;
  if (!date || !shares || !price_per_share) {
    return res.status(400).json({ error: 'date, shares og price_per_share er påkrævet' });
  }
  db.run(
    `UPDATE transactions SET date = ?, shares = ?, price_per_share = ?, brokerage = ?, notes = ?
     WHERE id = ?`,
    [date, shares, price_per_share, brokerage ?? 0, notes || null, req.params.id]
  );
  const tx = db.get(
    `SELECT t.*, f.ticker, f.name as fund_name
     FROM transactions t JOIN funds f ON t.fund_id = f.id
     WHERE t.id = ?`,
    [req.params.id]
  );
  if (!tx) return res.status(404).json({ error: 'Transaktion ikke fundet' });
  res.json(tx);
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  res.json({ message: 'Transaktion slettet' });
});

module.exports = router;
