import 'dart:convert';
import 'package:http/http.dart' as http;

class GoldAPI {
  static const String backendUrl = 'https://goldping-back.vercel.app/api/gold.js';
  static const String historicalUrl = 'https://goldping-back.vercel.app/api/scrape-historical';

  /// Anlık Fiyat (Döviz.com Scraping)
  static Future<double> fetchGold(String type, {String currency = 'TL'}) async {
    try {
      debugPrint('💰 Anlık fiyat çekiliyor (Döviz.com)...');
      
      final response = await http.get(Uri.parse(backendUrl))
          .timeout(const Duration(seconds: 30)); // ← 30 saniye

      debugPrint('📡 Response: ${response.statusCode}');

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        
        if (json['success'] == true) {
          final data = json['data'];
          
          double price;
          switch (type) {
            case 'gram': 
              price = (data['gram'] as num).toDouble(); 
              break;
            case 'ceyrek': 
              price = (data['ceyrek'] as num).toDouble(); 
              break;
            case 'yarim': 
              price = (data['yarim'] as num).toDouble(); 
              break;
            case 'tam': 
              price = (data['tam'] as num).toDouble(); 
              break;
            case 'ons': 
              price = (data['ons'] as num).toDouble(); 
              break;
            default: 
              price = (data['gram'] as num).toDouble();
          }
          
          debugPrint('✅ Anlık fiyat: ₺$price (Kaynak: ${json['source']})');
          return price;
        }
      }
      
      throw Exception('HTTP ${response.statusCode}');
      
    } catch (e) {
      debugPrint('❌ Anlık fiyat hatası: $e');
      rethrow;
    }
  }

  /// Tarihsel Veriler (Döviz.com Scraping/Simülasyon)
  static Future<List<double>> fetchHistoricalPrices(String type) async {
    try {
      debugPrint('🕷️ Tarihsel veri scraping başlıyor...');
      
      final response = await http.get(Uri.parse(historicalUrl))
          .timeout(const Duration(seconds: 45)); // ← 45 saniye (daha uzun!)

      debugPrint('📡 Scraping response: ${response.statusCode}');

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        
        if (json['success'] == true) {
          List<double> prices = [];
          
          for (var item in json['data']) {
            double gramPrice = (item['gramPrice'] as num).toDouble();
            
            // Altın türüne göre çarpan uygula
            double adjustedPrice = gramPrice;
            switch (type) {
              case 'gram':
                adjustedPrice = gramPrice;
                break;
              case 'ceyrek':
                adjustedPrice = gramPrice * 1.6;
                break;
              case 'yarim':
                adjustedPrice = gramPrice * 3.2;
                break;
              case 'tam':
                adjustedPrice = gramPrice * 6.4;
                break;
              case 'ons':
                adjustedPrice = gramPrice * 31.1035;
                break;
            }
            
            prices.add(adjustedPrice);
          }
          
          debugPrint('✅ ${prices.length} tarihsel veri alındı (${json['source']})');
          return prices;
        }
      }
      
      debugPrint('⚠️ Scraping başarısız, simülasyona geçiliyor...');
      throw Exception('Scraping failed');
      
    } catch (e) {
      debugPrint('❌ Tarihsel veri hatası: $e');
      debugPrint('🔄 Simülasyon verisi kullanılacak...');
      
      // Fallback: Simülasyon
      return _generateSimulatedPrices(type);
    }
  }

  /// Simülasyon (Fallback)
  static Future<List<double>> _generateSimulatedPrices(String type) async {
    try {
      final currentPrice = await fetchGold(type);
      
      List<double> prices = [];
      double price = currentPrice * 0.97;
      
      for (int i = 0; i < 30; i++) {
        double change = (price * 0.005) * (i.isEven ? 1.2 : -0.8);
        if (i % 7 == 0) change *= 1.5;
        
        price += change;
        
        if (price < currentPrice * 0.94) price = currentPrice * 0.945;
        if (price > currentPrice * 1.06) price = currentPrice * 1.055;
        
        prices.add(double.parse(price.toStringAsFixed(2)));
      }
      
      prices[29] = currentPrice;
      
      debugPrint('✅ ${prices.length} simülasyon verisi oluşturuldu');
      
      return prices;
      
    } catch (e) {
      debugPrint('❌ Simülasyon hatası: $e');
      rethrow;
    }
  }
}
