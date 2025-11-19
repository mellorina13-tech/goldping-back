const axios = require('axios');

module.exports = async (req, res) => {
  console.log('=================================');
  console.log('🔥 YENİ İSTEK ALINDI');
  console.log('Zaman:', new Date().toISOString());
  console.log('=================================');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS isteği, 200 döndürülüyor');
    return res.status(200).end();
  }

  try {
    console.log('📡 Döviz.com API çağrısı başlatılıyor...');
    console.log('URL: https://www.doviz.com/api/v1/golds');
    
    const response = await axios({
      method: 'GET',
      url: 'https://www.doviz.com/api/v1/golds',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Referer': 'https://www.doviz.com/',
      },
      timeout: 10000,
    });

    console.log('✅ Response alındı!');
    console.log('Status Code:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(response.headers));
    console.log('Data Keys:', Object.keys(response.data));
    console.log('Raw Data (ilk 500 karakter):', JSON.stringify(response.data).substring(0, 500));

    // Status kontrolü
    if (response.status !== 200) {
      console.error('❌ Status 200 değil:', response.status);
      return res.status(500).json({
        success: false,
        error: `API status hatası: ${response.status}`,
        details: response.statusText,
      });
    }

    const data = response.data;

    // Data kontrolü
    if (!data || typeof data !== 'object') {
      console.error('❌ Data geçersiz:', typeof data);
      return res.status(500).json({
        success: false,
        error: 'API geçersiz data döndü',
        receivedType: typeof data,
      });
    }

    console.log('📊 Data parse ediliyor...');

    // Gram altın kontrolü
    if (!data['gram-altin']) {
      console.error('❌ gram-altin key yok!');
      console.error('Mevcut keyler:', Object.keys(data));
      return res.status(500).json({
        success: false,
        error: 'gram-altin verisi bulunamadı',
        availableKeys: Object.keys(data),
      });
    }

    const gramData = data['gram-altin'];
    console.log('🔍 Gram altın data:', JSON.stringify(gramData));

    // Fiyat parse et
    const gramSelling = gramData.selling || gramData.satis;
    const gramBuying = gramData.buying || gramData.alis;

    console.log('Satış fiyatı:', gramSelling);
    console.log('Alış fiyatı:', gramBuying);

    if (!gramSelling && !gramBuying) {
      console.error('❌ Fiyat bulunamadı!');
      console.error('Gram data:', gramData);
      return res.status(500).json({
        success: false,
        error: 'Fiyat bilgisi bulunamadı',
        gramData: gramData,
      });
    }

    const gramPrice = parseFloat((gramSelling || gramBuying).toString().replace(',', '.'));
    console.log('💰 Parse edilen gram fiyatı:', gramPrice);

    // Fiyat geçerliliği
    if (isNaN(gramPrice)) {
      console.error('❌ Fiyat NaN!');
      return res.status(500).json({
        success: false,
        error: 'Fiyat sayıya çevrilemedi',
        rawPrice: gramSelling || gramBuying,
      });
    }

    if (gramPrice < 100) {
      console.error('❌ Fiyat çok düşük:', gramPrice);
      return res.status(500).json({
        success: false,
        error: 'Fiyat makul değil (çok düşük)',
        price: gramPrice,
      });
    }

    if (gramPrice > 10000) {
      console.error('❌ Fiyat çok yüksek:', gramPrice);
      return res.status(500).json({
        success: false,
        error: 'Fiyat makul değil (çok yüksek)',
        price: gramPrice,
      });
    }

    console.log('✅ Fiyat geçerli!');

    // Diğer altınları parse et
    const ceyrekPrice = data['ceyrek-altin']?.selling || data['ceyrek-altin']?.satis || (gramPrice * 1.6);
    const yarimPrice = data['yarim-altin']?.selling || data['yarim-altin']?.satis || (gramPrice * 3.2);
    const tamPrice = data['tam-altin']?.selling || data['tam-altin']?.satis || (gramPrice * 6.4);
    const onsPrice = data['ons']?.selling || data['ons']?.satis || (gramPrice * 31.1035);

    const result = {
      success: true,
      source: 'doviz.com',
      data: {
        gram: parseFloat(gramPrice.toFixed(2)),
        ceyrek: parseFloat(ceyrekPrice.toString().replace(',', '.')).toFixed(2),
        yarim: parseFloat(yarimPrice.toString().replace(',', '.')).toFixed(2),
        tam: parseFloat(tamPrice.toString().replace(',', '.')).toFixed(2),
        ons: parseFloat(onsPrice.toString().replace(',', '.')).toFixed(2),
      },
      timestamp: new Date().toISOString(),
    };

    console.log('🎉 BAŞARILI! Sonuç:', JSON.stringify(result));
    console.log('=================================\n');

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌❌❌ HATA OLUŞTU! ❌❌❌');
    console.error('Hata mesajı:', error.message);
    console.error('Hata tipi:', error.constructor.name);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
    } else if (error.request) {
      console.error('İstek gönderildi ama cevap yok');
      console.error('Request:', error.request);
    } else {
      console.error('İstek hazırlanırken hata');
    }
    
    console.error('Stack trace:', error.stack);
    console.error('=================================\n');

    return res.status(500).json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      timestamp: new Date().toISOString(),
    });
  }
};
