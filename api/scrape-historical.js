const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  console.log('🕷️ Tarihsel scraping başlıyor...');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = 'https://tr.investing.com/currencies/xau-try-historical-data';
    
    console.log('📡 Investing.com tarihsel veri sayfası yükleniyor...');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://tr.investing.com/',
      },
      timeout: 15000,
    });

    console.log('✅ Sayfa yüklendi, HTML parse ediliyor...');

    const $ = cheerio.load(response.data);
    const prices = [];

    // Tablo satırlarını bul
    const rows = $('table[data-test="historical-data-table"] tbody tr');
    
    console.log(`📊 ${rows.length} satır bulundu`);

    rows.each((index, element) => {
      if (index >= 30) return false; // İlk 30 gün

      const row = $(element);
      const cells = row.find('td');
      
      if (cells.length >= 2) {
        const dateText = cells.eq(0).text().trim();
        const priceText = cells.eq(1).text().trim();
        
        console.log(`  ${index + 1}. ${dateText}: ${priceText}`);
        
        // Fiyatı parse et
        let price = priceText
          .replace(/[^\d,\.]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        
        price = parseFloat(price);
        
        if (!isNaN(price) && price > 100000) {
          // XAU/TRY ons fiyatı → gram'a çevir
          const gramPrice = price / 31.1035;
          
          prices.push({
            date: dateText,
            onsPrice: parseFloat(price.toFixed(2)),
            gramPrice: parseFloat(gramPrice.toFixed(2)),
          });
        }
      }
    });

    if (prices.length === 0) {
      throw new Error('Veri çekilemedi - HTML yapısı değişmiş olabilir');
    }

    console.log(`✅ ${prices.length} fiyat başarıyla çekildi`);

    // Eskiden yeniye sırala
    prices.reverse();

    return res.status(200).json({
      success: true,
      source: 'investing.com-historical',
      count: prices.length,
      data: prices,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Scraping hatası:', error.message);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Scraping başarısız - site yapısı değişmiş olabilir',
      timestamp: new Date().toISOString(),
    });
  }
};
