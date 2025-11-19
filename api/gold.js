const axios = require('axios');

// Cache
let priceCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

function isCacheValid() {
  if (!priceCache || !cacheTimestamp) return false;
  return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

// 1. Döviz.com API (ÖNCELİK 1)
async function fetchFromDovizCom() {
  try {
    console.log('📡 Döviz.com API çağrılıyor...');
    
    const response = await axios.get(
      'https://www.doviz.com/api/v1/golds',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Döviz.com response:', response.status);

    if (response.status === 200 && response.data) {
      const data = response.data;
      
      console.log('📊 Döviz.com keys:', Object.keys(data));

      const parseGold = (key) => {
        if (!data[key]) return 0;
        const selling = data[key].selling || data[key].buying || 0;
        return parseFloat(String(selling).replace(',', '.'));
      };

      const prices = {
        gram: parseGold('gram-altin'),
        ceyrek: parseGold('ceyrek-altin'),
        yarim: parseGold('yarim-altin'),
        tam: parseGold('tam-altin'),
        ons: parseGold('ons'),
      };

      console.log('💰 Döviz.com fiyatlar:', prices);

      if (prices.gram > 100) {
        return {
          ...prices,
          source: 'doviz.com',
        };
      }
    }
  } catch (error) {
    console.log('⚠️ Döviz.com hatası:', error.message);
  }
  return null;
}

// 2. Mynet Finans API (ÖNCELİK 2)
async function fetchFromMynet() {
  try {
    console.log('📡 Mynet Finans deneniyor...');
    
    const response = await axios.get(
      'https://finans.mynet.com/borsa/altin-fiyatlari/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      }
    );

    if (response.status === 200) {
      const html = response.data;
      
      // Gram altın fiyatı bul
      const gramMatch = html.match(/Gram Altın.*?data-last="([\d,\.]+)"/s);
      const ceyrekMatch = html.match(/Çeyrek Altın.*?data-last="([\d,\.]+)"/s);
      const yarimMatch = html.match(/Yarım Altın.*?data-last="([\d,\.]+)"/s);
      const tamMatch = html.match(/Tam Altın.*?data-last="([\d,\.]+)"/s);
      
      if (gramMatch) {
        const gram = parseFloat(gramMatch[1].replace(',', '.'));
        
        console.log('💰 Mynet gram:', gram);
        
        if (gram > 100) {
          return {
            gram: gram,
            ceyrek: ceyrekMatch ? parseFloat(ceyrekMatch[1].replace(',', '.')) : gram * 1.6,
            yarim: yarimMatch ? parseFloat(yarimMatch[1].replace(',', '.')) : gram * 3.2,
            tam: tamMatch ? parseFloat(tamMatch[1].replace(',', '.')) : gram * 6.4,
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

// 3. Altın Piyasası (ÖNCELİK 3)
async function fetchFromAltinPiyasasi() {
  try {
    console.log('📡 Altın Piyasası deneniyor...');
    
    const response = await axios.get(
      'https://www.altinpiyasasi.net/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      }
    );

    if (response.status === 200) {
      const html = response.data;
      
      // Fiyatları HTML'den çek
      const gramMatch = html.match(/Gram Altın[^>]*>[\s\S]*?₺([\d,\.]+)/i);
      
      if (gramMatch) {
        const gram = parseFloat(gramMatch[1].replace(',', '.'));
        
        console.log('💰 Altın Piyasası gram:', gram);
        
        if (gram > 100) {
          return {
            gram: gram,
            ceyrek: gram * 1.6,
            yarim: gram * 3.2,
            tam: gram * 6.4,
            ons: gram * 31.1035,
            source: 'altinpiyasasi',
          };
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Altın Piyasası hatası:', error.message);
  }
  return null;
}

// 4. Bloomberg HT (ÖNCELİK 4)
async function fetchFromBloomberg() {
  try {
    console.log('📡 Bloomberg HT deneniyor...');
    
    const response = await axios.get(
      'https://www.bloomberght.com/altin',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      }
    );

    if (response.status === 200) {
      const html = response.data;
      
      const gramMatch = html.match(/Gram[^>]*>[\s\S]{0,200}?([\d,\.]+)/i);
      
      if (gramMatch) {
        const gram = parseFloat(gramMatch[1].replace(',', '.'));
        
        console.log('💰 Bloomberg gram:', gram);
        
        if (gram > 100) {
          return {
            gram: gram,
            ceyrek: gram * 1.6,
            yarim: gram * 3.2,
            tam: gram * 6.4,
            ons: gram * 31.1035,
            source: 'bloomberg',
          };
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Bloomberg hatası:', error.message);
  }
  return null;
}

// Multi-source fetcher (Öncelik sırasıyla)
async function fetchGoldPrice() {
  const sources = [
    fetchFromDovizCom,       // 1. ÖNCELİK (JSON API)
    fetchFromMynet,          // 2. ÖNCELİK (HTML scrape)
    fetchFromAltinPiyasasi,  // 3. ÖNCELİK (HTML scrape)
    fetchFromBloomberg,      // 4. ÖNCELİK (HTML scrape)
  ];

  for (const source of sources) {
    const result = await source();
    if (result && result.gram > 100) {
      return result;
    }
  }

  // Fallback (tüm kaynaklar başarısız)
  console.log('⚠️ TÜM KAYNAKLAR BAŞARISIZ, FALLBACK!');
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
  res.setHeader('Cache-Control', 'public, s-maxage=300'); // 5 dakika CDN cache
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔥 Altın fiyatı istendi');

    let priceData;

    // Cache kontrolü
    if (isCacheValid()) {
      console.log('✅ Cache\'den döndürülüyor (fresh)');
      priceData = priceCache;
    } else {
      console.log('🔄 Cache yok/eski, kaynaklar deneniyor...');
      priceData = await fetchGoldPrice();
      
      // Cache'e kaydet
      priceCache = priceData;
      cacheTimestamp = Date.now();
      
      console.log(`💾 Cache güncellendi (kaynak: ${priceData.source})`);
    }

    const result = {
      success: true,
      source: priceData.source,
      cached: (cacheTimestamp && (Date.now() - cacheTimestamp) > 1000),
      data: {
        gram: parseFloat(priceData.gram.toFixed(2)),
        ceyrek: parseFloat(priceData.ceyrek.toFixed(2)),
        yarim: parseFloat(priceData.yarim.toFixed(2)),
        tam: parseFloat(priceData.tam.toFixed(2)),
        ons: parseFloat(priceData.ons.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
      cacheExpiry: cacheTimestamp ? new Date(cacheTimestamp + CACHE_DURATION).toISOString() : null,
    };

    console.log(`✅ Başarıyla döndürüldü (${priceData.source})`);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ GENEL HATA:', error.message);
    
    // Emergency fallback
    return res.status(200).json({
      success: true,
      source: 'emergency-fallback',
      data: {
        gram: 5547.49,
        ceyrek: 8876.0,
        yarim: 17752.0,
        tam: 35504.0,
        ons: 172552.0,
      },
      timestamp: new Date().toISOString(),
    });
  }
};
