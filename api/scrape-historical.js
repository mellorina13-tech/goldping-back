const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  console.log('🕷️ Döviz.com tarihsel scraping...');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const currentUrl = 'https://altin.doviz.com/gram-altin';
    
    console.log('📡 Anlık fiyat alınıyor...');
    
    const currentResponse = await axios.get(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(currentResponse.data);
    
    let currentPrice = null;
    const priceElement = $('.value').first();
    if (priceElement.length > 0) {
      const priceText = priceElement.text().trim();
      currentPrice = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
    }

    if (!currentPrice || isNaN(currentPrice)) {
      $('span').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.match(/^\d{1,2}\.\d{3},\d{2}$/)) {
          currentPrice = parseFloat(text.replace(/\./g, '').replace(',', '.'));
          return false;
        }
      });
    }

    if (!currentPrice || currentPrice < 100) {
      throw new Error('Anlık fiyat alınamadı');
    }

    console.log('✅ Anlık fiyat:', currentPrice);

    const prices = [];
    let price = currentPrice * 0.97;

    for (let i = 0; i < 30; i++) {
      let changePercent = (Math.random() * 0.01) - 0.005;
      
      if (i % 7 === 0) {
        changePercent *= 1.8;
      }
      
      price = price * (1 + changePercent);
      
      if (price < currentPrice * 0.94) price = currentPrice * 0.945;
      if (price > currentPrice * 1.06) price = currentPrice * 1.055;
      
      const today = new Date();
      today.setDate(today.getDate() - (30 - i));
      const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
      
      prices.push({
        date: dateStr,
        onsPrice: parseFloat((price * 31.1035).toFixed(2)),
        gramPrice: parseFloat(price.toFixed(2)),
      });
    }

    prices[29].gramPrice = currentPrice;
    prices[29].onsPrice = parseFloat((currentPrice * 31.1035).toFixed(2));

    console.log(`✅ ${prices.length} tarihsel veri oluşturuldu`);

    return res.status(200).json({
      success: true,
      source: 'doviz.com-simulation',
      count: prices.length,
      data: prices,
      timestamp: new Date().toISOString(),
      note: 'Gerçek anlık fiyattan türetilmiş simülasyon',
    });

  } catch (error) {
    console.error('❌ Tarihsel veri hatası:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
