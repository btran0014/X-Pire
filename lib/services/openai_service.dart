import 'dart:convert';
import 'package:http/http.dart' as http;

class ProductExpiryResult {
  final String productName;
  final int? shelfLifeDays;
  final String storage;
  final double confidence;
  final String? sourceNote;

  ProductExpiryResult({
    required this.productName,
    required this.shelfLifeDays,
    required this.storage,
    required this.confidence,
    required this.sourceNote,
  });

  factory ProductExpiryResult.fromJson(Map<String, dynamic> json) {
    return ProductExpiryResult(
      productName: (json['product_name'] ?? '').toString().trim(),
      shelfLifeDays: json['shelf_life_days'] is int
          ? json['shelf_life_days'] as int
          : int.tryParse(json['shelf_life_days']?.toString() ?? ''),
      storage: (json['storage'] ?? 'unknown').toString().trim(),
      confidence: (json['confidence'] is num)
          ? (json['confidence'] as num).toDouble()
          : 0.0,
      sourceNote: json['source_note']?.toString(),
    );
  }
}

class OpenAIService {
  final String _apiKey;
  final http.Client _client;

  OpenAIService({String? apiKey, http.Client? client})
      : _apiKey = (apiKey ?? const String.fromEnvironment('OPENAI_API_KEY')).trim(),
        _client = client ?? http.Client();

  Future<ProductExpiryResult> lookupProductExpiry(String itemName) async {
    if (_apiKey.isEmpty) {
      throw Exception('Missing OpenAI API key. Provide OPENAI_API_KEY via --dart-define.');
    }

    final uri = Uri.parse('https://api.openai.com/v1/chat/completions');
    final prompt = _buildPrompt(itemName);

    final response = await _client.post(
      uri,
      headers: {
        'Authorization': 'Bearer $_apiKey',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'model': 'gpt-4o-mini',
        'temperature': 0.2,
        'response_format': {'type': 'json_object'},
        'messages': [
          {
            'role': 'system',
            'content': 'You extract product shelf-life info for grocery items and return JSON only.'
          },
          {
            'role': 'user',
            'content': prompt,
          }
        ]
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('OpenAI request failed (${response.statusCode}): ${response.body}');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final content = decoded['choices']?[0]?['message']?['content']?.toString() ?? '{}';

    Map<String, dynamic> json;
    try {
      json = jsonDecode(content) as Map<String, dynamic>;
    } catch (_) {
      json = {'product_name': itemName, 'shelf_life_days': null, 'storage': 'unknown', 'confidence': 0};
    }

    return ProductExpiryResult.fromJson(json);
  }

  String _buildPrompt(String itemName) {
    return '''
Given a grocery receipt item name, return a JSON object with:
- product_name: best-match full product name
- shelf_life_days: typical unopened shelf life in days (number or null if unknown)
- storage: one of "fridge", "freezer", "pantry", or "unknown"
- confidence: number between 0 and 1
- source_note: short note about the basis (e.g., typical product labeling; if unsure say "estimate")

Receipt item name: "$itemName"

Return JSON only.
''';
  }

  void dispose() {
    _client.close();
  }
}
