const https = require('https');

// Cache kurser i 5 minutter
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Hent kurs direkte fra Yahoo Finance chart-API (kræver ikke crumb)
function fetchYahooPrice(ticker) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
      },
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const meta = json?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
          resolve(price);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function getPrices(tickers) {
  const result = {};
  const toFetch = [];

  for (const ticker of tickers) {
    const cached = cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      result[ticker] = cached.price;
    } else {
      toFetch.push(ticker);
    }
  }

  if (toFetch.length > 0) {
    await Promise.all(
      toFetch.map(async (ticker) => {
        try {
          const price = await fetchYahooPrice(ticker);
          if (price) {
            cache.set(ticker, { price, timestamp: Date.now() });
          }
          result[ticker] = price;
        } catch (err) {
          console.warn(`Kunne ikke hente kurs for ${ticker}:`, err.message);
          result[ticker] = null;
        }
      })
    );
  }

  return result;
}

function clearCache() {
  cache.clear();
}

module.exports = { getPrices, clearCache };
