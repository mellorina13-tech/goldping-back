const axios = require('axios');

// USD/TRY Kuru Çek
async function getUSDTRY() {
  try {
    // TCMB USD/TRY kuru
    const today = new Date();
    const dateStr = formatDate(today);
    const startDate = formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)); // 7 gün önce
    
    const url = `https://evds2.tcmb.gov.tr/service/evds/series=TP.DK.USD.A.YTL&startDate=${startDate}&endDate=${dateStr}&type=json`;
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      const latest = response.data.items[response.data.items.length - 1];
      const rate = parseFloat(latest['TP_DK_USD_A_YTL']);
      console.log(`✅ TCMB USD/TRY: ${rate}`);
      return rate;
    }
  } catch (error) {
    console.log('⚠️ TCMB kur hatası:', error.message);
  }
  
  // Fallback: Yaklaşık kur
  return 34.50;
}

// Altın Fiyatları Çek (USD)
async function getGoldPricesUSD() {
  try {
    // Metals-API (Ücretsiz alternatif)
    const response = await axios.get(
      'https://api.metals.live/v1/spot',
      { timeout: 10000 }
    );
    
    if (response.data && response.data[0]) {
      const goldPrice = response.data[0].price; // Ons fiyatı USD
      console.log(`✅ Gold spot (USD): $${goldPrice}`);
      
      // Gram hesapla (1 ons = 31.1035 gram)
      const gramPrice = goldPrice / 31.1035;
      
      return {
        gram: gramPrice,
        ons: goldPrice,
      };
    }
  } catch (error) {
    console.log('⚠️ Metals.live hatası:', error.message);
  }
  
  // Fallback: Sabit USD fiyatları
  return {
    gram: 59.50, // ~$59.50/gram
    ons: 1850.00, // ~$1850/ons
  };
}

// Tarih formatla (DD-MM-YYYY)
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔥 Altın fiyatları istendi');

    // USD/TRY kurunu al
    const usdTry = await getUSDTRY();
    console.log(`💵 USD/TRY: ${usdTry}`);

    // Altın fiyatlarını USD olarak al
    const goldUSD = await getGoldPricesUSD();
    console.log(`💰 Gold (USD): Gram=$${goldUSD.gram.toFixed(2)}, Ons=$${goldUSD.ons.toFixed(2)}`);

    // TL'ye çevir
    const gramTL = goldUSD.gram * usdTry;
    const onsTL = goldUSD.ons * usdTry;

    // Diğer altınları hesapla
    const ceyrekTL = gramTL * 1.6; // ~1.6 gram
    const yarimTL = gramTL * 3.2; // ~3.2 gram
    const tamTL = gramTL * 6.4; // ~6.4 gram

    const result = {
      success: true,
      source: 'tcmb-metals',
      data: {
        gram: parseFloat(gramTL.toFixed(2)),
        ceyrek: parseFloat(ceyrekTL.toFixed(2)),
        yarim: parseFloat(yarimTL.toFixed(2)),
        tam: parseFloat(tamTL.toFixed(2)),
        ons: parseFloat(onsTL.toFixed(2)),
      },
      rates: {
        usdTry: usdTry,
        goldUSD: goldUSD.gram,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Sonuç:', JSON.stringify(result.data));

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Genel hata:', error.message);
    
    // Fallback: Sabit fiyatlar
    res.status(200).json({
      success: true,
      source: 'fallback',
      data: {
        gram: 5547.49,
        ceyrek: 896.20,
        yarim: 1792.40,
        tam: 3584.80,
        ons: 191234.50,
      },
      timestamp: new Date().toISOString(),
    });
  }
};
