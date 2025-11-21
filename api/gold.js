const axios = require('axios');

const RAPIDAPI_KEY = '628145dca4mshef6a351b880c48bp19969bjsnaad5c257ddcb';
const RAPIDAPI_HOST = 'harem-altin-live-gold-price-data.p.rapidapi.com';

module.exports = async (req, res) => {
  console.log('🔥 RapidAPI - Anlık altın fiyatları');
  
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
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        timeout: 15000,
      }
    );

    console.log('✅ RapidAPI status:', response.status);
    console.log('📦 RapidAPI data:', JSON.stringify(response.data, null, 2));

    const data = response.data;

    // Response formatını parse et
    let gramPrice, ceyrekPrice, yarimPrice, tamPrice, onsPrice;

    // Format 1: Direkt fiyatlar
    if (data.gram_altin) {
      gramPrice = parseFloat(data.gram_altin.satis || data.gram_altin.alis || data.gram_altin);
      ceyrekPrice = parseFloat(data.ceyrek_altin?.satis || data.ceyrek_altin?.alis || data.ceyrek_altin || 0);
      yarimPrice = parseFloat(data.yarim_altin?.satis || data.yarim_altin?.alis || data.yarim_altin || 0);
      tamPrice = parseFloat(data.tam_altin?.satis || data.tam_altin?.alis || data.tam_altin || 0);
      onsPrice = parseFloat(data.ons?.satis || data.ons?.alis || data.ons || 0);
    }
    // Format 2: data.prices
    else if (data.prices) {
      gramPrice = parseFloat(data.prices.gram_altin?.satis || data.prices.gram_altin?.alis || 0);
      ceyrekPrice = parseFloat(data.prices.ceyrek_altin?.satis || data.prices.ceyrek_altin?.alis || 0);
      yarimPrice = parseFloat(data.prices.yarim_altin?.satis || data.prices.yarim_altin?.alis || 0);
      tamPrice = parseFloat(data.prices.tam_altin?.satis || data.prices.tam_altin?.alis || 0);
      onsPrice = parseFloat(data.prices.ons?.satis || data.prices.ons?.alis || 0);
    }
    // Format 3: Array
    else if (Array.isArray(data)) {
      const gramData = data.find(item => item.name && item.name.includes('Gram'));
      const ceyrekData = data.find(item => item.name && item.name.includes('Çeyrek'));
      const yarimData = data.find(item => item.name && item.name.includes('Yarım'));
      const tamData = data.find(item => item.name && item.name.includes('Tam'));
      const onsData = data.find(item => item.name && item.name === 'ONS');

      gramPrice = parseFloat(gramData?.satis || gramData?.alis || gramData?.price || 0);
      ceyrekPrice = parseFloat(ceyrekData?.satis || ceyrekData?.alis || ceyrekData?.price || 0);
      yarimPrice = parseFloat(yarimData?.satis || yarimData?.alis || yarimData?.price || 0);
      tamPrice = parseFloat(tamData?.satis || tamData?.alis || tamData?.price || 0);
      onsPrice = parseFloat(onsData?.satis || onsData?.alis || onsData?.price || 0);
    }

    // Eğer gram fiyatı yoksa hata
    if (!gramPrice || gramPrice < 100) {
      throw new Error('Gram altın fiyatı bulunamadı');
    }

    // Eksik fiyatları hesapla
    if (!ceyrekPrice || ceyrekPrice < 100) ceyrekPrice = gramPrice * 1.6;
    if (!yarimPrice || yarimPrice < 100) yarimPrice = gramPrice * 3.2;
    if (!tamPrice || tamPrice < 100) tamPrice = gramPrice * 6.4;
    if (!onsPrice || onsPrice < 100) onsPrice = gramPrice * 31.1035;

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
