const express = require('express');
const router = express.Router();
const db = require('../db');
const priceService = require('../services/prices');

router.get('/', async (req, res) => {
  try {
    const funds = db.all('SELECT ticker FROM funds');
    const tickers = funds.map((f) => f.ticker);
    if (tickers.length === 0) return res.json({});
    const prices = await priceService.getPrices(tickers);
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:ticker', async (req, res) => {
  try {
    const prices = await priceService.getPrices([req.params.ticker.toUpperCase()]);
    const price = prices[req.params.ticker.toUpperCase()];
    if (!price) return res.status(404).json({ error: 'Kurs ikke fundet' });
    res.json({ ticker: req.params.ticker.toUpperCase(), price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
