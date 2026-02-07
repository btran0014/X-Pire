import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/fridge_item.dart';

class FridgeService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'fridge_items';
  
  List<FridgeItem> _items = [];
  bool _isLoading = false;
  String? _error;

  List<FridgeItem> get items => _items;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Get all items sorted by expiry date
  List<FridgeItem> get sortedItems {
    final sorted = List<FridgeItem>.from(_items);
    sorted.sort((a, b) => a.itemExpiryDate.compareTo(b.itemExpiryDate));
    return sorted;
  }

  /// Get expired items
  List<FridgeItem> get expiredItems {
    return _items.where((item) => item.isExpired).toList();
  }

  /// Get items expiring soon
  List<FridgeItem> get expiringSoonItems {
    return _items.where((item) => item.isExpiringSoon).toList();
  }

  /// Load all fridge items from Firestore
  Future<void> loadItems() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final snapshot = await _firestore.collection(_collection).get();
      _items = snapshot.docs
          .map((doc) => FridgeItem.fromMap(doc.data(), doc.id))
          .toList();
      _error = null;
    } catch (e) {
      _error = 'Failed to load items: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Add a new fridge item
  Future<void> addItem(FridgeItem item) async {
    try {
      final docRef = await _firestore
          .collection(_collection)
          .add(item.toMap());
      final newItem = item.copyWith(itemId: docRef.id);
      _items.add(newItem);
      _error = null;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to add item: $e';
      notifyListeners();
      rethrow;
    }
  }

  /// Add multiple fridge items (useful for bulk receipt processing)
  Future<void> addMultipleItems(List<FridgeItem> items) async {
    try {
      final newItems = <FridgeItem>[];
      for (final item in items) {
        final docRef = await _firestore.collection(_collection).add(item.toMap());
        final newItem = item.copyWith(itemId: docRef.id);
        newItems.add(newItem);
      }
      _items.addAll(newItems);
      notifyListeners();
    } catch (e) {
      _error = 'Failed to add items: $e';
      notifyListeners();
      rethrow;
    }
  }

  /// Update an existing fridge item
  Future<void> updateItem(FridgeItem item) async {
    try {
      await _firestore
          .collection(_collection)
          .doc(item.itemId)
          .update(item.toMap());
      
      final index = _items.indexWhere((i) => i.itemId == item.itemId);
      if (index != -1) {
        _items[index] = item;
        _error = null;
        notifyListeners();
      }
    } catch (e) {
      _error = 'Failed to update item: $e';
      notifyListeners();
      rethrow;
    }
  }

  /// Delete a fridge item
  Future<void> deleteItem(String itemId) async {
    try {
      await _firestore
          .collection(_collection)
          .doc(itemId)
          .delete();
      _items.removeWhere((item) => item.itemId == itemId);
      _error = null;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to delete item: $e';
      notifyListeners();
      rethrow;
    }
  }

  /// Decrease item quantity (remove if quantity reaches 0)
  Future<void> decreaseQuantity(String itemId) async {
    final item = _items.firstWhere((i) => i.itemId == itemId);
    
    if (item.itemQuantity > 1) {
      item.decreaseQuantity();
      await updateItem(item);
    } else {
      await deleteItem(itemId);
    }
  }

  /// Increase item quantity
  Future<void> increaseQuantity(String itemId) async {
    final item = _items.firstWhere((i) => i.itemId == itemId);
    item.increaseQuantity();
    await updateItem(item);
  }

  /// Clear error message
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
