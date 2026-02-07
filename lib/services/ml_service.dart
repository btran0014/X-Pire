import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'openai_service.dart';

class RecognizedItem {
  final String itemName;
  final DateTime? predictedExpiryDate;
  final String? matchedProductName;
  final String? storage;
  final double? confidence;
  final String? sourceNote;
  final int? shelfLifeDays;

  RecognizedItem({
    required this.itemName,
    required this.predictedExpiryDate,
    required this.matchedProductName,
    required this.storage,
    required this.confidence,
    required this.sourceNote,
    required this.shelfLifeDays,
  });
}

class MLService {
  TextRecognizer? _textRecognizer;
  final OpenAIService _openAIService;

  MLService({OpenAIService? openAIService})
      : _openAIService = openAIService ?? OpenAIService() {
    _textRecognizer = TextRecognizer();
  }

  /// Extract text from an image using ML Kit
  Future<String> extractTextFromImage(String imagePath) async {
    final inputImage = InputImage.fromFilePath(imagePath);
    
    try {
      final RecognizedText recognizedText = await _textRecognizer!.processImage(inputImage);
      return recognizedText.text;
    } catch (e) {
      throw Exception('Failed to extract text: $e');
    }
  }

  /// Process a receipt image to extract food items and predict expiry dates
  /// Returns a list of recognized items with predicted expiry dates
  Future<List<RecognizedItem>> processReceiptImage(String imagePath) async {
    try {
      // Extract text from the receipt
      final receiptText = await extractTextFromImage(imagePath);
      
      // Parse food items from the receipt text
      final items = _parseReceiptItems(receiptText);
      
      final recognizedItems = <RecognizedItem>[];
      for (final itemName in items) {
        final lookup = await _openAIService.lookupProductExpiry(itemName);
        final predicted = (lookup.shelfLifeDays != null)
            ? DateTime.now().add(Duration(days: lookup.shelfLifeDays!))
            : null;

        recognizedItems.add(
          RecognizedItem(
            itemName: itemName,
            predictedExpiryDate: predicted,
            matchedProductName: lookup.productName,
            storage: lookup.storage,
            confidence: lookup.confidence,
            sourceNote: lookup.sourceNote,
            shelfLifeDays: lookup.shelfLifeDays,
          ),
        );
      }

      return recognizedItems;
    } catch (e) {
      throw Exception('Failed to process receipt: $e');
    }
  }

  /// Parse receipt text to extract food item names
  /// This looks for common food items, avoiding prices, quantities, and receipts metadata
  List<String> _parseReceiptItems(String text) {
    final items = <String>{};
    final lines = text.split('\n');

    for (final line in lines) {
      final trimmed = line.trim();
      
      // Skip empty lines, lines with only numbers, total lines, etc.
      if (trimmed.isEmpty || 
          trimmed.replaceAll(RegExp(r'[0-9.,]'), '').isEmpty ||
          trimmed.toLowerCase().contains('total') ||
          trimmed.toLowerCase().contains('subtotal') ||
          trimmed.toLowerCase().contains('tax') ||
          trimmed.length < 3) {
        continue;
      }

      // Extract potential item names (remove prices and quantities)
      final cleanedItem = _cleanItemName(trimmed);
      
      if (cleanedItem.isNotEmpty && cleanedItem.length >= 3) {
        items.add(cleanedItem);
      }
    }

    return items.toList();
  }

  /// Clean a receipt line to extract just the item name
  /// Removes prices, quantities, and other metadata
  String _cleanItemName(String line) {
    // Remove prices (patterns like $19.99, 19.99, etc.)
    String cleaned = line.replaceAll(RegExp(r'\$?\d+\.?\d*'), '');
    
    // Remove quantities (patterns like "x2", "qty: 3", etc.)
    cleaned = cleaned.replaceAll(RegExp(r'(?:qty|x|quantity|amount)[\s:]*\d+', caseSensitive: false), '');
    
    // Remove extra whitespace
    cleaned = cleaned.replaceAll(RegExp(r'\s+'), ' ').trim();
    
    // Remove common receipt metadata
    cleaned = cleaned.replaceAll(RegExp(r'(?:item|#|code|sku|barcode)\s*[:\-]?\s*\w+', caseSensitive: false), '');
    
    return cleaned.trim();
  }

  /// Dispose of resources
  void dispose() {
    _textRecognizer?.close();
    _openAIService.dispose();
  }
}
