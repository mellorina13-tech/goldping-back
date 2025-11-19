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

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }

    const data = response.data;

    if (!data.success) {
      console.error('❌ API başarısız');
      return res.status(500).json({
        success: false,
        error: 'API başarısız',
      });
    }

    const result = data.result;
    console.log('📊 Sonuç sayısı:', result.length);

    // Altınları bul
    const gramAltin = result.find(item => item.name && item.name.includes('Gram'));
    const ceyrekAltin = result.find(item => item.name && item.name.includes('Çeyrek') && !item.name.includes('Eski'));
    const yarimAltin = result.find(item => item.name && item.name.includes('Yarım') && !item.name.includes('Eski'));
    const tamAltin = result.find(item => item.name && item.name.includes('Tam') && !item.name.includes('Eski'));
    const onsAltin = result.find(item => item.name && item.name === 'ONS Altın');

    if (!gramAltin) {
      console.error('❌ Gram altın bulunamadı!');
      return res.status(500).json({
        success: false,
        error: 'Gram altın verisi bulunamadı',
      });
    }

    console.log('💰 Gram data:', gramAltin);

    // Fiyatları parse et (number veya string olabilir)
    const parsePrice = (value) => {
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        return parseFloat(value.replace(',', '.'));
      }
      return 0;
    };

    const gramPrice = parsePrice(gramAltin.selling || gramAltin.buying);
    const ceyrekPrice = ceyrekAltin ? parsePrice(ceyrekAltin.selling) : gramPrice * 1.6;
    const yarimPrice = yarimAltin ? parsePrice(yarimAltin.selling) : gramPrice * 3.2;
    const tamPrice = tamAltin ? parsePrice(tamAltin.selling) : gramPrice * 6.4;
    const onsPrice = onsAltin ? parsePrice(onsAltin.selling) : gramPrice * 31.1035;

    console.log('💰 Parse edilen fiyatlar:');
    console.log('  Gram:', gramPrice);
    console.log('  Çeyrek:', ceyrekPrice);
    console.log('  Yarım:', yarimPrice);
    console.log('  Tam:', tamPrice);
    console.log('  Ons:', onsPrice);

    // Fiyat kontrolü
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

    console.log('🎉 BAŞARILI!');
    console.log('=================================\n');

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌❌❌ HATA OLUŞTU! ❌❌❌');
    console.error('Hata:', error.message);
    console.error('Stack:', error.stack);
    console.error('=================================\n');

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
