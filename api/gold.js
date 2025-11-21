const axios = require('axios');

const RAPIDAPI_KEY = '628145dca4mshef6a351b880c48bp19969bjsnaad5c257ddcb';
const RAPIDAPI_HOST = 'harem-altin-live-gold-price-data.p.rapidapi.com';

module.exports = async (req, res) => {
  console.log('🔥 RapidAPI Harem - Anlık altın fiyatları');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📡 RapidAPI çağrılıyor...');
    
    const response = await axios.get(
      'https://harem-altin-live-gold-price-data.p.rapidapi.com/harem_altin/prices',
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
        timeout: 15000,
      }
    );

    console.log('✅ RapidAPI status:', response.status);

    if (!response.data || !response.data.success || !response.data.data) {
      throw new Error('Invalid response format');
    }

    const data = response.data.data;

    // Array'den istediğimiz altın türlerini bul
    const gramData = data.find(item => item.key === 'GRAM ALTIN');
    const ceyrekData = data.find(item => item.key === 'YENİ ÇEYREK');
    const yarimData = data.find(item => item.key === 'YENİ YARIM');
    const tamData = data.find(item => item.key === 'YENİ TAM');
    const onsData = data.find(item => item.key === 'ONS');

    if (!gramData) {
      throw new Error('GRAM ALTIN bulunamadı');
    }

    // Fiyatları parse et (5.678,36 → 5678.36)
    const parsePrice = (priceStr) => {
      if (!priceStr) return 0;
      // Bin ayırıcı noktaları kaldır, ondalık virgülü noktaya çevir
      return parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
    };

    const gramPrice = parsePrice(gramData.sell || gramData.buy);
    const ceyrekPrice = ceyrekData ? parsePrice(ceyrekData.sell || ceyrekData.buy) : gramPrice * 1.6;
    const yarimPrice = yarimData ? parsePrice(yarimData.sell || yarimData.buy) : gramPrice * 3.2;
    const tamPrice = tamData ? parsePrice(tamData.sell || tamData.buy) : gramPrice * 6.4;
    const onsPrice = onsData ? parsePrice(onsData.sell || onsData.buy) : gramPrice * 31.1035;

    if (gramPrice < 100) {
      throw new Error('Geçersiz fiyat: ' + gramPrice);
    }

    console.log('💰 Fiyatlar:');
    console.log(`  Gram: ₺${gramPrice.toFixed(2)}`);
    console.log(`  Çeyrek: ₺${ceyrekPrice.toFixed(2)}`);
    console.log(`  Yarım: ₺${yarimPrice.toFixed(2)}`);
    console.log(`  Tam: ₺${tamPrice.toFixed(2)}`);
    console.log(`  Ons: ₺${onsPrice.toFixed(2)}`);

    return res.status(200).json({
      success: true,
      source: 'rapidapi-harem',
      data: {
        gram: parseFloat(gramPrice.toFixed(2)),
        ceyrek: parseFloat(ceyrekPrice.toFixed(2)),
        yarim: parseFloat(yarimPrice.toFixed(2)),
        tam: parseFloat(tamPrice.toFixed(2)),
        ons: parseFloat(onsPrice.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ RapidAPI hatası:', error.message);
    console.error('Stack:', error.stack);

    // Fallback: Döviz.com scraping
    console.log('🔄 Fallback: Döviz.com scraping...');
    
    return await fallbackDovizCom(res);
  }
};

// Fallback: Döviz.com scraping
async function fallbackDovizCom(res) {
  try {
    const cheerio = require('cheerio');
    
    console.log('📡 Döviz.com scraping...');
    
    const response = await axios.get('https://altin.doviz.com/gram-altin', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    let gramPrice = null;
    
    const priceElement = $('.value').first();
    if (priceElement.length > 0) {
      gramPrice = parseFloat(priceElement.text().trim().replace(/\./g, '').replace(',', '.'));
    }

    if (!gramPrice || isNaN(gramPrice)) {
      $('span').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.match(/^\d{1,2}\.\d{3},\d{2}$/)) {
          gramPrice = parseFloat(text.replace(/\./g, '').replace(',', '.'));
          return false;
        }
      });
    }

    if (!gramPrice || gramPrice < 100) {
      throw new Error('Fiyat alınamadı');
    }

    console.log('✅ Döviz.com fiyat:', gramPrice);

    return res.status(200).json({
      success: true,
      source: 'doviz.com-scraping-fallback',
      data: {
        gram: parseFloat(gramPrice.toFixed(2)),
        ceyrek: parseFloat((gramPrice * 1.6).toFixed(2)),
        yarim: parseFloat((gramPrice * 3.2).toFixed(2)),
        tam: parseFloat((gramPrice * 6.4).toFixed(2)),
        ons: parseFloat((gramPrice * 31.1035).toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Fallback da başarısız:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
