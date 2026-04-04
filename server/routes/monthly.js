const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateHoldings } = require('../utils/holdings');
const priceService = require('../services/prices');

router.get('/', (req, res) => {
  const snapshots = db.all(
    `SELECT ms.*, f.ticker, f.name as fund_name
     FROM monthly_snapshots ms
     JOIN funds f ON ms.fund_id = f.id
     ORDER BY ms.year DESC, ms.month DESC`
  );

  const grouped = {};
  for (const s of snapshots) {
    const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
    if (!grouped[key]) {
      grouped[key] = { year: s.year, month: s.month, key, funds: [], total_value: 0 };
    }
    grouped[key].funds.push(s);
    grouped[key].total_value += s.value;
  }

  res.json(Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key)));
});

router.post('/snapshot', async (req, res) => {
  try {
    const now = new Date();
    const year = req.body.year ?? now.getFullYear();
    const month = req.body.month ?? now.getMonth() + 1;
    await takeSnapshot(year, month);
    res.json({ message: `Snapshot taget for ${year}-${String(month).padStart(2, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function takeSnapshot(year, month) {
  const holdings = calculateHoldings();
  if (holdings.length === 0) return;

  const tickers = holdings.map((h) => h.ticker);
  const prices = await priceService.getPrices(tickers);

  for (const h of holdings) {
    const price = prices[h.ticker];
    if (!price) continue;
    const value = h.shares * price;
    const unrealized_gain = value - h.total_cost;
    db.run(
      `INSERT OR REPLACE INTO monthly_snapshots
         (year, month, fund_id, shares_held, price, value, avg_cost, unrealized_gain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [year, month, h.fund_id, h.shares, price, value, h.avg_cost_per_share, unrealized_gain]
    );
  }
}

module.exports = router;
module.exports.takeSnapshot = takeSnapshot;
