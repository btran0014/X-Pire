import 'package:intl/intl.dart';

class FridgeItem {
  final String itemId;
  String itemName;
  DateTime itemLogDate;
  DateTime itemExpiryDate;
  int itemQuantity;

  FridgeItem({
    required this.itemId,
    required this.itemName,
    required this.itemLogDate,
    required this.itemExpiryDate,
    required this.itemQuantity,
  });

  // Convert from Firestore
  factory FridgeItem.fromMap(Map<String, dynamic> map, String documentId) {
    return FridgeItem(
      itemId: documentId,
      itemName: map['itemName'] ?? '',
      itemLogDate: DateTime.parse(map['itemLogDate'] ?? DateTime.now().toIso8601String()),
      itemExpiryDate: DateTime.parse(map['itemExpiryDate'] ?? DateTime.now().toIso8601String()),
      itemQuantity: map['itemQuantity'] ?? 1,
    );
  }

  // Convert to Firestore
  Map<String, dynamic> toMap() {
    return {
      'itemName': itemName.toLowerCase(),
      'itemLogDate': itemLogDate.toIso8601String(),
      'itemExpiryDate': itemExpiryDate.toIso8601String(),
      'itemQuantity': itemQuantity,
    };
  }

  // Get formatted expiry date (MM/dd/yyyy)
  String get formattedExpiryDate {
    return DateFormat('MM/dd/yyyy').format(itemExpiryDate);
  }

  // Get formatted log date
  String get formattedLogDate {
    return DateFormat('MM/dd/yyyy').format(itemLogDate);
  }

  // Calculate days until expiry
  int get daysUntilExpiry {
    return itemExpiryDate.difference(DateTime.now()).inDays;
  }

  // Check if item is expired
  bool get isExpired {
    return DateTime.now().isAfter(itemExpiryDate);
  }

  // Check if item is expiring soon (within 3 days)
  bool get isExpiringSoon {
    return !isExpired && daysUntilExpiry <= 3;
  }

  // Decrease quantity
  void decreaseQuantity() {
    if (itemQuantity > 0) {
      itemQuantity--;
    }
  }

  // Increase quantity
  void increaseQuantity() {
    itemQuantity++;
  }

  // Get item name in proper case
  String get displayName {
    return itemName.split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  // Copy with method for immutability
  FridgeItem copyWith({
    String? itemId,
    String? itemName,
    DateTime? itemLogDate,
    DateTime? itemExpiryDate,
    int? itemQuantity,
  }) {
    return FridgeItem(
      itemId: itemId ?? this.itemId,
      itemName: itemName ?? this.itemName,
      itemLogDate: itemLogDate ?? this.itemLogDate,
      itemExpiryDate: itemExpiryDate ?? this.itemExpiryDate,
      itemQuantity: itemQuantity ?? this.itemQuantity,
    );
  }
}
