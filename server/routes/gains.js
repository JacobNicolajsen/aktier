const express = require('express');
const router = express.Router();
const { calculateGains } = require('../utils/holdings');

router.get('/', (req, res) => {
  try {
    const gains = calculateGains();
    const totalGain = gains.reduce((s, g) => s + g.gain, 0);
    const totalProceeds = gains.reduce((s, g) => s + g.proceeds, 0);
    const totalCostBasis = gains.reduce((s, g) => s + g.cost_basis, 0);

    const byYear = {};
    for (const g of gains) {
      const year = g.date.substring(0, 4);
      if (!byYear[year]) {
        byYear[year] = { year, gains: [], total_gain: 0, total_proceeds: 0 };
      }
      byYear[year].gains.push(g);
      byYear[year].total_gain += g.gain;
      byYear[year].total_proceeds += g.proceeds;
    }

    res.json({
      transactions: gains,
      summary: { total_gain: totalGain, total_proceeds: totalProceeds, total_cost_basis: totalCostBasis },
      by_year: Object.values(byYear).sort((a, b) => b.year.localeCompare(a.year)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
