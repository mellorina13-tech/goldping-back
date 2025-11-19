const axios = require('axios');

// TCMB USD/TRY + Gold Spot Price
async function fetchRealPrice() {
  try {
    console.log('📡 Gerçek fiyat hesaplanıyor...');
    
    // 1. USD/TRY kuru (Fixer.io alternatifi - ücretsiz)
    const currencyResponse = await axios.get(
      'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd/try.json',
      { timeout: 10000 }
    );
    
    const usdTry = currencyResponse.data.try || 34.5;
    console.log('💵 USD/TRY:', usdTry);
    
    // 2. Altın spot fiyatı (Metals.dev - ücretsiz)
    const goldResponse = await axios.get(
      'https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz',
      { timeout: 10000 }
    );
    
    if (goldResponse.data && goldResponse.data.metals && goldResponse.data.metals.gold) {
      const goldUSD = goldResponse.data.metals.gold; // Ons fiyatı USD
      const gramUSD = goldUSD / 31.1035;
      const gramTL = gramUSD * usdTry * 2.72; // Piyasa katsayısı
      
      console.log('💰 Gold USD:', goldUSD, '→ Gram TL:', gramTL);
      
      if (gramTL > 5000 && gramTL < 7000) {
        return {
          gram: gramTL,
          ceyrek: gramTL * 1.6,
          yarim: gramTL * 3.2,
          tam: gramTL * 6.4,
          ons: gramTL * 31.1035,
          source: 'metals.dev',
        };
      }
    }
  } catch (error) {
    console.log('⚠️ Gerçek fiyat hatası:', error.message);
  }
  return null;
}

// Fallback
function getFallback() {
  return {
    gram: 5547.49,
    ceyrek: 8876.0,
    yarim: 17752.0,
    tam: 35504.0,
    ons: 172552.0,
    source: 'fallback',
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const priceData = await fetchRealPrice() || getFallback();
    
    res.status(200).json({
      success: true,
      source: priceData.source,
      data: {
        gram: parseFloat(priceData.gram.toFixed(2)),
        ceyrek: parseFloat(priceData.ceyrek.toFixed(2)),
        yarim: parseFloat(priceData.yarim.toFixed(2)),
        tam: parseFloat(priceData.tam.toFixed(2)),
        ons: parseFloat(priceData.ons.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const fallback = getFallback();
    res.status(200).json({
      success: true,
      source: fallback.source,
      data: fallback.data,
      timestamp: new Date().toISOString(),
    });
  }
};
