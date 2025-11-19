const axios = require('axios');

// Döviz.com API (TEMİZ KODLAMA)
async function fetchFromDovizCom() {
  console.log('📡 [1/3] Döviz.com deneniyor...');
  
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://www.doviz.com/api/v1/golds',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
      validateStatus: (status) => status === 200, // Sadece 200'ü kabul et
    });

    console.log('✅ Döviz.com BAŞARILI! Status:', response.status);
    console.log('📦 Data keys:', Object.keys(response.data));

    const data = response.data;
    
    // Fiyatları parse et
    const gramData = data['gram-altin'];
    const ceyrekData = data['ceyrek-altin'];
    const yarimData = data['yarim-altin'];
    const tamData = data['tam-altin'];
    const onsData = data['ons'];
    
    console.log('🔍 Gram data:', gramData);
    
    if (!gramData) {
      console.log('❌ Gram data yok!');
      return null;
    }
    
    const gramPrice = parseFloat((gramData.selling || gramData.buying || '0').toString().replace(',', '.'));
    
    console.log('💰 Gram fiyat:', gramPrice);
    
    if (gramPrice < 5000 || gramPrice > 7000) {
      console.log('❌ Fiyat aralık dışı:', gramPrice);
      return null;
    }
    
    const result = {
      gram: gramPrice,
      ceyrek: parseFloat((ceyrekData?.selling || gramPrice * 1.6).toString().replace(',', '.')),
      yarim: parseFloat((yarimData?.selling || gramPrice * 3.2).toString().replace(',', '.')),
      tam: parseFloat((tamData?.selling || gramPrice * 6.4).toString().replace(',', '.')),
      ons: parseFloat((onsData?.selling || gramPrice * 31.1035).toString().replace(',', '.')),
      source: 'doviz.com',
    };
    
    console.log('✅ BAŞARILI! Doviz.com verisi:', result);
    return result;
    
  } catch (error) {
    console.log('❌ Döviz.com HATA:', error.message);
    console.log('   Status:', error.response?.status);
    console.log('   Data:', error.response?.data);
    return null;
  }
}

// Fallback (Son Çare)
function getFallback() {
  console.log('⚠️ FALLBACK KULLANILIYOR!');
  return {
    gram: 5547.49,
    ceyrek: 8876.0,
    yarim: 17752.0,
    tam: 35504.0,
    ons: 172552.0,
    source: 'fallback',
  };
}

// Ana Handler
module.exports = async (req, res) => {
  console.log('=================================');
  console.log('🔥 YENİ İSTEK ALINDI');
  console.log('=================================');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Döviz.com dene
    const dovizResult = await fetchFromDovizCom();
    
    if (dovizResult) {
      console.log('🎉 BAŞARILI! Kaynak: doviz.com');
      return res.status(200).json({
        success: true,
        source: dovizResult.source,
        data: {
          gram: parseFloat(dovizResult.gram.toFixed(2)),
          ceyrek: parseFloat(dovizResult.ceyrek.toFixed(2)),
          yarim: parseFloat(dovizResult.yarim.toFixed(2)),
          tam: parseFloat(dovizResult.tam.toFixed(2)),
          ons: parseFloat(dovizResult.ons.toFixed(2)),
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // 2. Hiçbiri çalışmadı, fallback
    console.log('⚠️ TÜM API\'LER BAŞARISIZ!');
    const fallback = getFallback();
    
    return res.status(200).json({
      success: true,
      source: fallback.source,
      data: {
        gram: fallback.gram,
        ceyrek: fallback.ceyrek,
        yarim: fallback.yarim,
        tam: fallback.tam,
        ons: fallback.ons,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ GENEL HATA:', error);
    
    const fallback = getFallback();
    return res.status(200).json({
      success: true,
      source: 'error-fallback',
      data: fallback,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
