const axios = require('axios');

// Cache
let priceCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

function isCacheValid() {
  if (!priceCache || !cacheTimestamp) return false;
  return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

// 1. Döviz.com API
async function fetchFromDovizCom() {
  try {
    console.log('📡 Döviz.com çağrılıyor...');
    
    const response = await axios.get(
      'https://www.doviz.com/api/v1/golds',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.doviz.com/',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Döviz.com:', response.status);

    if (response.status === 200 && response.data) {
      const data = response.data;
      
      const parsePrice = (key) => {
        if (!data[key]) return 0;
        const price = data[key].selling || data[key].buying || 0;
        return parseFloat(String(price).replace(',', '.'));
      };

      const prices = {
        gram: parsePrice('gram-altin'),
        ceyrek: parsePrice('ceyrek-altin'),
        yarim: parsePrice('yarim-altin'),
        tam: parsePrice('tam-altin'),
        ons: parsePrice('ons'),
      };

      console.log('💰 Döviz.com fiyatlar:', prices);

      if (prices.gram > 5000 && prices.gram < 7000) {
        return { ...prices, source: 'doviz.com' };
      }
    }
  } catch (error) {
    console.log('⚠️ Döviz.com hatası:', error.message);
  }
  return null;
}

// 2. Investing.com API
async function fetchFromInvesting() {
  try {
    console.log('📡 Investing.com çağrılıyor...');
    
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
      
      console.log('💰 Investing.com gram:', gramTL);
      
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

// 3. Mynet Finans
async function fetchFromMynet() {
  try {
    console.log('📡 Mynet çağrılıyor...');
    
    const response = await axios.get(
      'https://finans.mynet.com/altin/',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000,
      }
    );

    if (response.status === 200) {
      const html = response.data;
      
      // Gram altın fiyatını bul
      const gramMatch = html.match(/Gram Altın.*?data-last="([\d,\.]+)"/s);
      
      if (gramMatch) {
        const gram = parseFloat(gramMatch[1].replace(',', '.'));
        
        console.log('💰 Mynet gram:', gram);
        
        if (gram > 5000 && gram < 7000) {
          return {
            gram: gram,
            ceyrek: gram * 1.6,
            yarim: gram * 3.2,
            tam: gram * 6.4,
            ons: gram * 31.1035,
            source: 'mynet',
          };
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Mynet hatası:', error.message);
  }
  return null;
}

// Fallback fiyatlar (manuel güncellenir)
function getFallbackPrice() {
  console.log('⚠️ Tüm API\'ler başarısız, fallback kullanılıyor');
  
  return {
    gram: 5547.49,
    ceyrek: 8876.0,
    yarim: 17752.0,
    tam: 35504.0,
    ons: 172552.0,
    source: 'fallback',
  };
}

// Multi-source fetcher (Sırayla dene)
async function fetchGoldPrice() {
  const sources = [
    fetchFromDovizCom,
    fetchFromInvesting,
    fetchFromMynet,
  ];

  for (const source of sources) {
    const result = await source();
    if (result && result.gram > 5000 && result.gram < 7000) {
      console.log(`✅ Geçerli fiyat bulundu: ${result.source}`);
      return result;
    }
  }

  return getFallbackPrice();
}

// Vercel Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 dakika CDN cache
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔥 Altın fiyatı istendi');

    let priceData;

    // Cache kontrolü
    if (isCacheValid()) {
      console.log('✅ Cache\'den döndürülüyor');
      priceData = priceCache;
    } else {
      console.log('🔄 Yeni fiyat çekiliyor...');
      priceData = await fetchGoldPrice();
      
      // Cache'e kaydet
      priceCache = priceData;
      cacheTimestamp = Date.now();
      
      console.log(`💾 Cache güncellendi (${priceData.source})`);
    }

    // Response döndür
    return res.status(200).json({
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
      cacheExpiry: new Date(cacheTimestamp + CACHE_DURATION).toISOString(),
    });

  } catch (error) {
    console.error('❌ Genel hata:', error.message);
    
    // Emergency fallback
    const fallback = getFallbackPrice();
    
    return res.status(200).json({
      success: true,
      source: fallback.source,
      data: {
        gram: fallback.gram,
        ceyrek: fallback.ceyrek,
        yarim: fallback.yarim,
        tam: fallback.tam,
        ons: fallback.ons,
      },
      timestamp: new Date().toISOString(),
    });
  }
};
