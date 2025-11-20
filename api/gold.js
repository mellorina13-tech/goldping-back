const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  console.log('🔥 Anlık fiyat istendi (Investing.com)');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = 'https://tr.investing.com/currencies/xau-try';
    
    console.log('📡 Investing.com XAU/TRY sayfası yükleniyor...');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://tr.investing.com/',
      },
      timeout: 15000,
    });

    console.log('✅ Sayfa yüklendi, fiyat parse ediliyor...');

    const $ = cheerio.load(response.data);
    
    // Anlık fiyatı bul (XAU/TRY - ons/TRY)
    let onsPriceTRY = null;
    
    // Selector 1: data-test attribute
    const priceElement1 = $('[data-test="instrument-price-last"]');
    if (priceElement1.length > 0) {
      onsPriceTRY = priceElement1.text().trim();
      console.log('✅ Fiyat bulundu (selector 1):', onsPriceTRY);
    }
    
    // Selector 2: CSS class
    if (!onsPriceTRY) {
      const priceElement2 = $('.text-5xl');
      if (priceElement2.length > 0) {
        onsPriceTRY = priceElement2.first().text().trim();
        console.log('✅ Fiyat bulundu (selector 2):', onsPriceTRY);
      }
    }

    // Selector 3: Başka bir alternatif
    if (!onsPriceTRY) {
      const priceElement3 = $('span[class*="text-5xl"]');
      if (priceElement3.length > 0) {
        onsPriceTRY = priceElement3.first().text().trim();
        console.log('✅ Fiyat bulundu (selector 3):', onsPriceTRY);
      }
    }

    if (!onsPriceTRY) {
      throw new Error('Fiyat bulunamadı - HTML yapısı değişmiş olabilir');
    }

    // Fiyatı parse et
    // Örnek: "173.184,50" veya "173,184.50"
    let onsPrice = onsPriceTRY
      .replace(/[^\d,\.]/g, '') // Sadece sayı, virgül, nokta
      .replace(/\./g, '') // Binlik noktaları kaldır
      .replace(',', '.'); // Virgülü noktaya çevir
    
    onsPrice = parseFloat(onsPrice);
    
    if (isNaN(onsPrice) || onsPrice < 100000) {
      throw new Error(`Geçersiz fiyat: ${onsPrice}`);
    }

    console.log('💰 XAU/TRY (ons): ₺' + onsPrice);

    // Gram fiyatı hesapla
    const gramPrice = onsPrice / 31.1035;
    
    console.log('💰 Gram altın: ₺' + gramPrice.toFixed(2));

    // Diğer ağırlıkları hesapla
    const ceyrekPrice = gramPrice * 1.6;
    const yarimPrice = gramPrice * 3.2;
    const tamPrice = gramPrice * 6.4;

    return res.status(200).json({
      success: true,
      source: 'investing.com-live',
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
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Investing.com scraping başarısız - site yapısı değişmiş olabilir',
      timestamp: new Date().toISOString(),
    });
  }
};
