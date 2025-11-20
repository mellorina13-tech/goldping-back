const axios = require('axios');

module.exports = async (req, res) => {
  console.log('🕷️ Döviz.com grafik API (tarihsel veri)...');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Strateji 1: Grafik API endpoint'ini dene
    console.log('📡 Strateji 1: Grafik API deneniyor...');
    
    const apiUrls = [
      'https://altin.doviz.com/api/chart/GRAM_ALTIN?period=1M',
      'https://api.doviz.com/gold/chart/GRAM_ALTIN?period=30d',
      'https://altin.doviz.com/data/gram-altin/1m',
    ];

    let graphData = null;

    for (const url of apiUrls) {
      try {
        console.log(`  Deneniyor: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': 'https://altin.doviz.com/gram-altin',
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 10000,
        });

        if (response.status === 200 && response.data) {
          graphData = response.data;
          console.log(`  ✅ Başarılı! ${url}`);
          console.log(`  📊 Data tipi: ${typeof graphData}`);
          break;
        }
      } catch (err) {
        console.log(`  ❌ Başarısız: ${err.message}`);
      }
    }

    // Eğer API çalışırsa
    if (graphData) {
      console.log('✅ Grafik verisi bulundu!');
      
      const prices = [];
      
      // Veri formatını parse et
      if (Array.isArray(graphData)) {
        // Format: [{date: "...", price: "..."}, ...]
        graphData.slice(-30).forEach(item => {
          const date = item.date || item.time || item.x;
          const price = parseFloat(item.price || item.value || item.y);
          
          if (price > 100) {
            prices.push({
              date: date,
              gramPrice: parseFloat(price.toFixed(2)),
              onsPrice: parseFloat((price * 31.1035).toFixed(2)),
            });
          }
        });
      } else if (graphData.data && Array.isArray(graphData.data)) {
        // Format: {data: [{...}]}
        graphData.data.slice(-30).forEach(item => {
          const date = item.date || item.time || item.x;
          const price = parseFloat(item.price || item.value || item.y);
          
          if (price > 100) {
            prices.push({
              date: date,
              gramPrice: parseFloat(price.toFixed(2)),
              onsPrice: parseFloat((price * 31.1035).toFixed(2)),
            });
          }
        });
      }

      if (prices.length > 0) {
        console.log(`✅ ${prices.length} gerçek tarihsel veri çekildi!`);
        
        return res.status(200).json({
          success: true,
          source: 'doviz.com-graph-api',
          count: prices.length,
          data: prices,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Strateji 2: HTML'den grafik script'ini parse et
    console.log('📡 Strateji 2: HTML parse ediliyor...');
    
    const cheerio = require('cheerio');
    
    const htmlResponse = await axios.get('https://altin.doviz.com/gram-altin', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(htmlResponse.data);
    
    // Script taglarında grafik verisi ara
    let scriptData = null;
    
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      
      if (scriptContent && scriptContent.includes('chart') && scriptContent.includes('data')) {
        // chartData = [...] formatında veri ara
        const match = scriptContent.match(/chartData\s*=\s*(\[[\s\S]*?\]);/);
        if (match) {
          try {
            scriptData = JSON.parse(match[1]);
            console.log('✅ Script içinden grafik verisi bulundu!');
            return false; // break
          } catch (e) {
            console.log('⚠️ JSON parse hatası');
          }
        }
      }
    });

    if (scriptData && Array.isArray(scriptData)) {
      const prices = scriptData.slice(-30).map(item => {
        const price = parseFloat(item[1] || item.y || item.value);
        const date = new Date(item[0] || item.x).toLocaleDateString('tr-TR');
        
        return {
          date: date,
          gramPrice: parseFloat(price.toFixed(2)),
          onsPrice: parseFloat((price * 31.1035).toFixed(2)),
        };
      }).filter(p => p.gramPrice > 100);

      if (prices.length > 0) {
        console.log(`✅ ${prices.length} HTML'den tarihsel veri çekildi!`);
        
        return res.status(200).json({
          success: true,
          source: 'doviz.com-html-parse',
          count: prices.length,
          data: prices,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Strateji 3: Fallback - Anlık fiyattan simülasyon
    console.log('📡 Strateji 3: Simülasyon oluşturuluyor...');
    
    const currentResponse = await axios.get('https://altin.doviz.com/gram-altin', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 10000,
    });

    const $2 = cheerio.load(currentResponse.data);
    
    let currentPrice = null;
    const priceElement = $2('.value').first();
    if (priceElement.length > 0) {
      const priceText = priceElement.text().trim();
      currentPrice = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
    }

    if (!currentPrice || currentPrice < 100) {
      throw new Error('Fiyat alınamadı');
    }

    console.log('✅ Anlık fiyat:', currentPrice);

    const prices = [];
    let price = currentPrice * 0.97;

    for (let i = 0; i < 30; i++) {
      let changePercent = (Math.random() * 0.01) - 0.005;
      if (i % 7 === 0) changePercent *= 1.8;
      
      price = price * (1 + changePercent);
      
      if (price < currentPrice * 0.94) price = currentPrice * 0.945;
      if (price > currentPrice * 1.06) price = currentPrice * 1.055;
      
      const today = new Date();
      today.setDate(today.getDate() - (30 - i));
      const dateStr = today.toLocaleDateString('tr-TR');
      
      prices.push({
        date: dateStr,
        gramPrice: parseFloat(price.toFixed(2)),
        onsPrice: parseFloat((price * 31.1035).toFixed(2)),
      });
    }

    prices[29].gramPrice = currentPrice;
    prices[29].onsPrice = parseFloat((currentPrice * 31.1035).toFixed(2));

    console.log(`✅ ${prices.length} simülasyon verisi oluşturuldu`);

    return res.status(200).json({
      success: true,
      source: 'doviz.com-simulation',
      count: prices.length,
      data: prices,
      timestamp: new Date().toISOString(),
      note: 'Grafik API bulunamadı, simülasyon kullanıldı',
    });

  } catch (error) {
    console.error('❌ Tüm stratejiler başarısız:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
