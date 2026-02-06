import 'package:google_ml_kit/google_ml_kit.dart';

class MLService {
  TextRecognizer? _textRecognizer;

  MLService() {
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

  /// Parse expiry date from extracted text
  /// Supports formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
  DateTime? parseExpiryDate(String text) {
    // Common patterns for expiry dates
    final patterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      RegExp(r'\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])[-/](\d{4})\b'),
      // DD/MM/YYYY or DD-MM-YYYY
      RegExp(r'\b(0?[1-9]|[12][0-9]|3[01])[-/](0?[1-9]|1[0-2])[-/](\d{4})\b'),
      // YYYY-MM-DD or YYYY/MM/DD
      RegExp(r'\b(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])\b'),
      // Month names: "Jan 15, 2026" or "January 15 2026"
      RegExp(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{4})\b', caseSensitive: false),
      // "EXP" or "Exp" or "Best Before" followed by date
      RegExp(r'(?:EXP|Exp|BEST\s*BEFORE|Best\s*Before|USE\s*BY|Use\s*By)[:\s]*(0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])[-/](\d{4})', caseSensitive: false),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        try {
          DateTime? date = _parseMatchedDate(match);
          if (date != null && _isReasonableExpiryDate(date)) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  DateTime? _parseMatchedDate(RegExpMatch match) {
    final fullMatch = match.group(0)!;
    
    // Handle month name format
    if (fullMatch.contains(RegExp(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', caseSensitive: false))) {
      return _parseMonthNameDate(match);
    }

    int year, month, day;

    // Determine format based on match groups
    if (match.groupCount >= 3) {
      final g1 = int.parse(match.group(1)!);
      final g2 = int.parse(match.group(2)!);
      final g3 = int.parse(match.group(3)!);

      // YYYY-MM-DD format
      if (g1 > 1900) {
        year = g1;
        month = g2;
        day = g3;
      }
      // MM/DD/YYYY format (common in US)
      else if (g1 <= 12 && g3 > 1900) {
        month = g1;
        day = g2;
        year = g3;
      }
      // DD/MM/YYYY format (common elsewhere)
      else if (g2 <= 12 && g3 > 1900) {
        day = g1;
        month = g2;
        year = g3;
      } else {
        return null;
      }

      return DateTime(year, month, day);
    }

    return null;
  }

  DateTime? _parseMonthNameDate(RegExpMatch match) {
    final monthMap = {
      'jan': 1, 'january': 1,
      'feb': 2, 'february': 2,
      'mar': 3, 'march': 3,
      'apr': 4, 'april': 4,
      'may': 5,
      'jun': 6, 'june': 6,
      'jul': 7, 'july': 7,
      'aug': 8, 'august': 8,
      'sep': 9, 'september': 9,
      'oct': 10, 'october': 10,
      'nov': 11, 'november': 11,
      'dec': 12, 'december': 12,
    };

    final monthStr = match.group(1)!.toLowerCase();
    final day = int.parse(match.group(2)!);
    final year = int.parse(match.group(3)!);

    final month = monthMap[monthStr];
    if (month != null) {
      return DateTime(year, month, day);
    }

    return null;
  }

  /// Check if the parsed date is reasonable for an expiry date
  bool _isReasonableExpiryDate(DateTime date) {
    final now = DateTime.now();
    final tenYearsFromNow = now.add(const Duration(days: 3650));
    
    // Expiry date should be between now and 10 years from now
    // (some items like canned goods can have very long shelf life)
    return date.isAfter(now.subtract(const Duration(days: 30))) && 
           date.isBefore(tenYearsFromNow);
  }

  /// Dispose of resources
  void dispose() {
    _textRecognizer?.close();
  }
}
