const db = require('../db');

/**
 * Beregner beholdning og gennemsnitlig købskurs for alle fonde
 * ved hjælp af gennemsnitsmetoden (dansk SKAT-standard).
 */
function calculateHoldings() {
  const funds = db.all('SELECT * FROM funds');
  const holdings = [];

  for (const fund of funds) {
    const transactions = db.all(
      'SELECT * FROM transactions WHERE fund_id = ? ORDER BY date ASC, created_at ASC',
      [fund.id]
    );

    let totalShares = 0;
    let totalCost = 0;

    for (const tx of transactions) {
      if (tx.type === 'buy') {
        totalCost += tx.shares * tx.price_per_share + tx.brokerage;
        totalShares += tx.shares;
      } else if (tx.type === 'sell') {
        const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
        totalCost -= avgCost * tx.shares;
        totalShares -= tx.shares;
        if (totalShares < 0.0001) {
          totalShares = 0;
          totalCost = 0;
        }
      }
    }

    const avgCostPerShare = totalShares > 0 ? totalCost / totalShares : 0;

    holdings.push({
      fund_id: fund.id,
      ticker: fund.ticker,
      name: fund.name,
      shares: totalShares,
      avg_cost_per_share: avgCostPerShare,
      total_cost: totalCost,
    });
  }

  return holdings.filter((h) => h.shares > 0.0001);
}

/**
 * Beregner realiserede gevinster/tab for alle salgstransaktioner
 */
function calculateGains() {
  const funds = db.all('SELECT * FROM funds');
  const allGains = [];

  for (const fund of funds) {
    const transactions = db.all(
      'SELECT * FROM transactions WHERE fund_id = ? ORDER BY date ASC, created_at ASC',
      [fund.id]
    );

    let totalShares = 0;
    let totalCost = 0;

    for (const tx of transactions) {
      if (tx.type === 'buy') {
        totalCost += tx.shares * tx.price_per_share + tx.brokerage;
        totalShares += tx.shares;
      } else if (tx.type === 'sell') {
        const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
        const proceeds = tx.shares * tx.price_per_share - tx.brokerage;
        const costBasis = avgCost * tx.shares;
        const gain = proceeds - costBasis;

        allGains.push({
          transaction_id: tx.id,
          fund_id: fund.id,
          ticker: fund.ticker,
          name: fund.name,
          date: tx.date,
          shares_sold: tx.shares,
          sale_price: tx.price_per_share,
          avg_cost_per_share: avgCost,
          proceeds,
          cost_basis: costBasis,
          gain,
          brokerage: tx.brokerage,
          notes: tx.notes,
        });

        totalCost -= avgCost * tx.shares;
        totalShares -= tx.shares;
        if (totalShares < 0.0001) {
          totalShares = 0;
          totalCost = 0;
        }
      }
    }
  }

  return allGains.sort((a, b) => b.date.localeCompare(a.date));
}

module.exports = { calculateHoldings, calculateGains };
