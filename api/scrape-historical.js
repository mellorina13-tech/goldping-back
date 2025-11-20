const axios = require('axios');
const cheerio = require('cheerio');

// Statik tarihsel veri
const historicalData = require('../data/gold_historical.json');

module.exports = async (req, res) => {
  console.log('📊 Tarihsel veri (statik JSON + güncel fiyat)...');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Statik JSON'dan tüm veriyi al
    let allData = [...historicalData];
    
    console.log(`📊 Statik JSON'dan ${allData.length} veri alındı`);

    // 2. Bugünün güncel fiyatını Döviz.com'dan çek
    console.log('📡 Güncel fiyat Döviz.com\'dan çekiliyor...');
    
    try {
      const response = await axios.get('https://altin.doviz.com/gram-altin', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      let currentPrice = null;
      
      // Selector 1: .value
      const priceElement = $('.value').first();
      if (priceElement.length > 0) {
        const priceText = priceElement.text().trim();
        currentPrice = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
        console.log('✅ Güncel fiyat bulundu (.value):', currentPrice);
      }

      // Selector 2: span tarama
      if (!currentPrice || isNaN(currentPrice)) {
        $('span').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text.match(/^\d{1,2}\.\d{3},\d{2}$/)) {
            currentPrice = parseFloat(text.replace(/\./g, '').replace(',', '.'));
            console.log('✅ Güncel fiyat bulundu (span):', currentPrice);
            return false;
          }
        });
      }

      if (currentPrice && currentPrice > 100) {
        console.log('💰 Güncel fiyat:', currentPrice);
        
        // 3. Bugünün tarihini al
        const today = new Date();
        const todayStr = today.toLocaleDateString('tr-TR'); // 20.11.2025
        
        const todayData = {
          date: todayStr,
          gramPrice: parseFloat(currentPrice.toFixed(2)),
          onsPrice: parseFloat((currentPrice * 31.1035).toFixed(2)),
        };

        // 4. Bugünün verisi zaten varsa güncelle, yoksa ekle
        const todayIndex = allData.findIndex(item => item.date === todayStr);
        
        if (todayIndex !== -1) {
          allData[todayIndex] = todayData;
          console.log('📝 Bugünün verisi güncellendi');
        } else {
          allData.push(todayData);
          console.log('➕ Bugünün verisi eklendi');
        }
      } else {
        console.log('⚠️ Güncel fiyat alınamadı, sadece statik veri kullanılıyor');
      }
    } catch (priceError) {
      console.log('⚠️ Güncel fiyat çekilemedi:', priceError.message);
    }

    // 5. Son 30 günü döndür
    const last30Days = allData.slice(-30);

    console.log(`✅ Toplam ${last30Days.length} veri hazırlandı`);

    return res.status(200).json({
      success: true,
      source: 'static-json-with-live-update',
      count: last30Days.length,
      data: last30Days,
      timestamp: new Date().toISOString(),
      note: 'Investing.com tarihsel veri + Döviz.com güncel fiyat',
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);

    // Fallback: Sadece statik JSON
    const last30Days = historicalData.slice(-30);

    return res.status(200).json({
      success: true,
      source: 'static-json-only',
      count: last30Days.length,
      data: last30Days,
      timestamp: new Date().toISOString(),
      note: 'Sadece statik tarihsel veri (güncel fiyat eklenemedi)',
    });
  }
};
