const axios = require('axios');

const RAPIDAPI_KEY = '628145dca4mshef6a351b880c48bp19969bjsnaad5c257ddcb'; // RapidAPI key

module.exports = async (req, res) => {
  console.log('🔥 RapidAPI - Anlık fiyat');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📡 RapidAPI çağrılıyor...');
    
    const response = await axios.get(
      'https://harem-altin-live-gold-price-data.p.rapidapi.com/latest',
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'harem-altin-live-gold-price-data.p.rapidapi.com',
        },
        timeout: 15000,
      }
    );

    console.log('✅ RapidAPI response:', response.status);

    const data = response.data;

    // RapidAPI response formatı (örnek):
    // {
    //   "gram_altin": {"alis": 5500, "satis": 5550},
    //   "ceyrek_altin": {"alis": 8800, "satis": 8900},
    //   "yarim_altin": {...},
    //   "tam_altin": {...},
    //   "ons": {...}
    // }

    const gramPrice = parseFloat(data.gram_altin?.satis || data.gram_altin?.alis || 0);
    const ceyrekPrice = parseFloat(data.ceyrek_altin?.satis || data.ceyrek_altin?.alis || 0);
    const yarimPrice = parseFloat(data.yarim_altin?.satis || data.yarim_altin?.alis || 0);
    const tamPrice = parseFloat(data.tam_altin?.satis || data.tam_altin?.alis || 0);
    const onsPrice = parseFloat(data.ons?.satis || data.ons?.alis || 0);

    if (gramPrice < 100) {
      throw new Error('Geçersiz fiyat');
    }

    console.log('💰 Gram altın: ₺' + gramPrice.toFixed(2));

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

    // Fallback: Döviz.com scraping
    console.log('🔄 Fallback: Döviz.com scraping...');
    
    return await fallbackDovizCom(res);
  }
};

// Fallback: Döviz.com scraping
async function fallbackDovizCom(res) {
  try {
    const axios = require('axios');
    const cheerio = require('cheerio');
    
    const response = await axios.get('https://altin.doviz.com/gram-altin', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    let gramPrice = null;
    
    const priceElement = $('.value').first();
    if (priceElement.length > 0) {
      gramPrice = parseFloat(priceElement.text().trim().replace(/\./g, '').replace(',', '.'));
    }

    if (!gramPrice || gramPrice < 100) {
      throw new Error('Fiyat alınamadı');
    }

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
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
