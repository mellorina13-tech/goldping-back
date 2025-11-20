const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  console.log('🔥 Döviz.com scraping (anlık fiyat)');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = 'https://altin.doviz.com/gram-altin';
    
    console.log('📡 Döviz.com sayfası yükleniyor...');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Referer': 'https://altin.doviz.com/',
      },
      timeout: 15000,
    });

    console.log('✅ Sayfa yüklendi, fiyat parse ediliyor...');

    const $ = cheerio.load(response.data);
    
    let gramPrice = null;
    
    // Selector 1: .value class
    const priceElement1 = $('.value').first();
    if (priceElement1.length > 0) {
      const priceText = priceElement1.text().trim();
      gramPrice = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
      console.log('✅ Fiyat bulundu (selector 1):', priceText, '→', gramPrice);
    }
    
    // Selector 2: data-socket-key
    if (!gramPrice || isNaN(gramPrice)) {
      const priceElement2 = $('[data-socket-key*="gram"]').first();
      if (priceElement2.length > 0) {
        const priceText = priceElement2.text().trim();
        gramPrice = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
        console.log('✅ Fiyat bulundu (selector 2):', priceText, '→', gramPrice);
      }
    }

    // Selector 3: span tara
    if (!gramPrice || isNaN(gramPrice)) {
      $('span').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.match(/^\d{1,2}\.\d{3},\d{2}$/)) {
          gramPrice = parseFloat(text.replace(/\./g, '').replace(',', '.'));
          console.log('✅ Fiyat bulundu (selector 3):', text, '→', gramPrice);
          return false;
        }
      });
    }

    if (!gramPrice || isNaN(gramPrice) || gramPrice < 100) {
      throw new Error(`Geçersiz fiyat: ${gramPrice}`);
    }

    console.log('💰 Gram altın: ₺' + gramPrice.toFixed(2));

    const ceyrekPrice = gramPrice * 1.6;
    const yarimPrice = gramPrice * 3.2;
    const tamPrice = gramPrice * 6.4;
    const onsPrice = gramPrice * 31.1035;

    return res.status(200).json({
      success: true,
      source: 'doviz.com-scraping',
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
    console.error('❌ Döviz.com scraping hatası:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Döviz.com scraping başarısız',
      timestamp: new Date().toISOString(),
    });
  }
};
