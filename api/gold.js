const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Bigpara
    try {
      const response = await axios.get(
        'https://bigpara.hurriyet.com.tr/api/v1/doviz/altin',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data;

      return res.status(200).json({
        success: true,
        source: 'bigpara',
        data: {
          gram: parseFloat(data.GA?.satis || '5547.49'),
          ceyrek: parseFloat(data.C?.satis || '896.20'),
          yarim: parseFloat(data.Y?.satis || '1792.40'),
          tam: parseFloat(data.T?.satis || '3584.80'),
          ons: parseFloat(data.ONS?.satis || '191234.50'),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.log('Bigpara error:', err.message);
    }

    // Fallback
    return res.status(200).json({
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

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
