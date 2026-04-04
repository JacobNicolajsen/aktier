const express = require('express');
const router = express.Router();
const { calculateHoldings } = require('../utils/holdings');
const priceService = require('../services/prices');

router.get('/', async (req, res) => {
  try {
    const holdings = calculateHoldings();
    if (holdings.length === 0) return res.json([]);

    const tickers = holdings.map((h) => h.ticker);
    const prices = await priceService.getPrices(tickers);

    const enriched = holdings.map((h) => {
      const price = prices[h.ticker];
      const current_value = price != null ? h.shares * price : null;
      const unrealized_gain = price != null ? current_value - h.total_cost : null;
      const unrealized_gain_pct =
        h.total_cost > 0 && unrealized_gain !== null
          ? (unrealized_gain / h.total_cost) * 100
          : null;

      return { ...h, current_price: price ?? null, current_value, unrealized_gain, unrealized_gain_pct };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
