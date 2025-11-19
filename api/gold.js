const axios = require('axios');

// Cache
let priceCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

function isCacheValid() {
  if (!priceCache || !cacheTimestamp) return false;
  return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

async function fetchFromInvesting() {
  try {
    console.log('📡 Investing.com...');
    
    // Investing.com API (ücretsiz alternatif)
    const response = await axios.get(
      'https://api.investing.com/api/financialdata/8830/historical/chart/?period=P1D&interval=PT1M',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'domain-id': '1',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const latest = response.data.data[response.data.data.length - 1];
      const onsTL = parseFloat(latest[1]);
      const gramTL = onsTL / 31.1035;
      
      if (gramTL > 5000 && gramTL < 7000) {
        return {
          gram: gramTL,
          ceyrek: gramTL * 1.6,
          yarim: gramTL * 3.2,
          tam: gramTL * 6.4,
          ons: onsTL,
          source: 'investing.com',
        };
      }
    }
  } catch (error) {
    console.log('⚠️ Investing hatası:', error.message);
  }
  return null;
}
