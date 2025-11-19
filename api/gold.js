const axios = require('axios');

// CollectAPI Key
const COLLECTAPI_KEY = 'apikey 1s6VTMY0sbOjCjmHa21lD1:5oh2c7HZO7zxER6bUYLPor';

module.exports = async (req, res) => {
  console.log('=================================');
  console.log('🔥 YENİ İSTEK ALINDI');
  console.log('Zaman:', new Date().toISOString());
  console.log('=================================');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📡 CollectAPI çağrılıyor...');
    console.log('URL: https://api.collectapi.com/economy/goldPrice');
    
    const response = await axios({
      method: 'GET',
      url: 'https://api.collectapi.com/economy/goldPrice',
      headers: {
        'authorization': COLLECTAPI_KEY,
        'content-type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ Response alındı!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data));

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }

    const data = response.data;

    if (!data.success) {
      console.error('❌ API başarısız:', data.message);
      return res.status(500).json({
        success: false,
        error: 'API başarısız',
        message: data.message,
      });
    }

    // CollectAPI format:
    // {
    //   "success": true,
    //   "result": [
    //     {"name": "Gram Altın", "buying": "5545.20", "selling": "5547.49", ...},
    //     {"name": "Çeyrek Altın", ...},
    //     ...
    //   ]
    // }

    const result = data.result;
    console.log('📊 Sonuç sayısı:', result.length);

    // Altınları bul
    const gramAltin = result.find(item => item.name && item.name.includes('Gram'));
    const ceyrekAltin = result.find(item => item.name && item.name.includes('Çeyrek'));
    const yarimAltin = result.find(item => item.name && item.name.includes('Yarım'));
    const tamAltin = result.find(item => item.name && item.name.includes('Tam'));

    console.log('Gram:', gramAltin);
    console.log('Çeyrek:', ceyrekAltin);

    if (!gramAltin) {
      console.error('❌ Gram altın bulunamadı!');
      console.error('Mevcut itemler:', result.map(r => r.name));
      return res.status(500).json({
        success: false,
        error: 'Gram altın verisi bulunamadı',
        availableItems: result.map(r => r.name),
      });
    }

    const gramPrice = parseFloat(gramAltin.selling.replace(',', '.'));
    const ceyrekPrice = ceyrekAltin ? parseFloat(ceyrekAltin.selling.replace(',', '.')) : gramPrice * 1.6;
    const yarimPrice = yarimAltin ? parseFloat(yarimAltin.selling.replace(',', '.')) : gramPrice * 3.2;
    const tamPrice = tamAltin ? parseFloat(tamAltin.selling.replace(',', '.')) : gramPrice * 6.4;
    const onsPrice = gramPrice * 31.1035;

    console.log('💰 Fiyatlar:');
    console.log('  Gram:', gramPrice);
    console.log('  Çeyrek:', ceyrekPrice);
    console.log('  Yarım:', yarimPrice);
    console.log('  Tam:', tamPrice);

    if (gramPrice < 100 || gramPrice > 10000) {
      console.error('❌ Fiyat makul değil:', gramPrice);
      return res.status(500).json({
        success: false,
        error: 'Fiyat aralık dışı',
        price: gramPrice,
      });
    }

    const responseData = {
      success: true,
      source: 'collectapi',
      data: {
        gram: parseFloat(gramPrice.toFixed(2)),
        ceyrek: parseFloat(ceyrekPrice.toFixed(2)),
        yarim: parseFloat(yarimPrice.toFixed(2)),
        tam: parseFloat(tamPrice.toFixed(2)),
        ons: parseFloat(onsPrice.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    };

    console.log('🎉 BAŞARILI! Sonuç:', JSON.stringify(responseData));
    console.log('=================================\n');

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌❌❌ HATA OLUŞTU! ❌❌❌');
    console.error('Hata:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data));
    console.error('Stack:', error.stack);
    console.error('=================================\n');

    return res.status(500).json({
      success: false,
      error: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      timestamp: new Date().toISOString(),
    });
  }
};
