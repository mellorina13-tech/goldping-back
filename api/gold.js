const axios = require('axios');

const COLLECTAPI_KEY = 'apikey 1s6VTMY0sbOjCjmHa21lD1:5oh2c7HZO7zxER6bUYLPor';

module.exports = async (req, res) => {
  console.log('🔥 Anlık fiyat istendi');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await axios({
      method: 'GET',
      url: 'https://api.collectapi.com/economy/goldPrice',
      headers: {
        'authorization': COLLECTAPI_KEY,
        'content-type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`);
    }

    const data = response.data;

    if (!data.success) {
      throw new Error('API başarısız');
    }

    const result = data.result;

    const gramAltin = result.find(item => item.name && item.name.includes('Gram'));
    const ceyrekAltin = result.find(item => item.name && item.name.includes('Çeyrek') && !item.name.includes('Eski'));
    const yarimAltin = result.find(item => item.name && item.name.includes('Yarım') && !item.name.includes('Eski'));
    const tamAltin = result.find(item => item.name && item.name.includes('Tam') && !item.name.includes('Eski'));
    const onsAltin = result.find(item => item.name && item.name === 'ONS Altın');

    if (!gramAltin) {
      throw new Error('Gram altın bulunamadı');
    }

    const parsePrice = (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value.replace(',', '.'));
      return 0;
    };

    const gramPrice = parsePrice(gramAltin.selling || gramAltin.buying);
    const ceyrekPrice = ceyrekAltin ? parsePrice(ceyrekAltin.selling) : gramPrice * 1.6;
    const yarimPrice = yarimAltin ? parsePrice(yarimAltin.selling) : gramPrice * 3.2;
    const tamPrice = tamAltin ? parsePrice(tamAltin.selling) : gramPrice * 6.4;
    const onsPrice = onsAltin ? parsePrice(onsAltin.selling) : gramPrice * 31.1035;

    if (gramPrice < 100 || gramPrice > 10000) {
      throw new Error('Fiyat aralık dışı');
    }

    console.log('✅ Anlık fiyat başarılı:', gramPrice);

    return res.status(200).json({
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
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
