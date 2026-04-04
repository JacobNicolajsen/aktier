const express = require('express');
const router = express.Router();
const db = require('../db');

function calcTax(total_amount, tax_rate) {
  const tax_amount = total_amount * tax_rate;
  const net_amount = total_amount - tax_amount;
  return { tax_amount, net_amount };
}

// GET alle udbytter
router.get('/', (req, res) => {
  const { fund_id } = req.query;
  let query = `
    SELECT d.*, f.ticker, f.name as fund_name
    FROM dividends d
    JOIN funds f ON d.fund_id = f.id
  `;
  const params = [];
  if (fund_id) {
    query += ' WHERE d.fund_id = ?';
    params.push(fund_id);
  }
  query += ' ORDER BY d.date DESC';
  res.json(db.all(query, params));
});

// POST registrer udbytte
router.post('/', (req, res) => {
  const { fund_id, date, amount_per_share, shares, tax_rate = 0.27, notes } = req.body;

  if (!fund_id || !date || !amount_per_share || !shares) {
    return res.status(400).json({ error: 'fund_id, date, amount_per_share og shares er påkrævet' });
  }

  const fund = db.get('SELECT * FROM funds WHERE id = ?', [fund_id]);
  if (!fund) return res.status(404).json({ error: 'Fond ikke fundet' });

  const total_amount = parseFloat(amount_per_share) * parseFloat(shares);
  const { tax_amount, net_amount } = calcTax(total_amount, parseFloat(tax_rate));

  try {
    db.run(
      `INSERT INTO dividends (fund_id, date, amount_per_share, shares, total_amount, tax_rate, tax_amount, net_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fund_id, date, amount_per_share, shares, total_amount, tax_rate, tax_amount, net_amount, notes || null]
    );
    const dividend = db.get(
      `SELECT d.*, f.ticker, f.name as fund_name
       FROM dividends d JOIN funds f ON d.fund_id = f.id
       WHERE d.id = last_insert_rowid()`
    );
    res.status(201).json(dividend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT opdater udbytte
router.put('/:id', (req, res) => {
  const { date, amount_per_share, shares, tax_rate = 0.27, notes } = req.body;
  if (!date || !amount_per_share || !shares) {
    return res.status(400).json({ error: 'date, amount_per_share og shares er påkrævet' });
  }
  const total_amount = parseFloat(amount_per_share) * parseFloat(shares);
  const { tax_amount, net_amount } = calcTax(total_amount, parseFloat(tax_rate));

  db.run(
    `UPDATE dividends SET date = ?, amount_per_share = ?, shares = ?, total_amount = ?,
     tax_rate = ?, tax_amount = ?, net_amount = ?, notes = ?
     WHERE id = ?`,
    [date, amount_per_share, shares, total_amount, tax_rate, tax_amount, net_amount, notes || null, req.params.id]
  );
  const dividend = db.get(
    `SELECT d.*, f.ticker, f.name as fund_name
     FROM dividends d JOIN funds f ON d.fund_id = f.id
     WHERE d.id = ?`,
    [req.params.id]
  );
  if (!dividend) return res.status(404).json({ error: 'Udbytte ikke fundet' });
  res.json(dividend);
});

// DELETE slet udbytte
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM dividends WHERE id = ?', [req.params.id]);
  res.json({ message: 'Udbytte slettet' });
});

// GET årsvis sammendrag til SKAT
router.get('/summary/yearly', (req, res) => {
  const rows = db.all(
    `SELECT strftime('%Y', date) as year, f.name as fund_name, f.ticker,
            SUM(total_amount) as total_gross,
            SUM(tax_amount)   as total_tax,
            SUM(net_amount)   as total_net,
            COUNT(*)          as count
     FROM dividends d JOIN funds f ON d.fund_id = f.id
     GROUP BY year, d.fund_id
     ORDER BY year DESC, f.name ASC`
  );

  const byYear = {};
  for (const r of rows) {
    if (!byYear[r.year]) {
      byYear[r.year] = { year: r.year, funds: [], total_gross: 0, total_tax: 0, total_net: 0 };
    }
    byYear[r.year].funds.push(r);
    byYear[r.year].total_gross += r.total_gross;
    byYear[r.year].total_tax   += r.total_tax;
    byYear[r.year].total_net   += r.total_net;
  }

  res.json(Object.values(byYear).sort((a, b) => b.year.localeCompare(a.year)));
});

module.exports = router;
