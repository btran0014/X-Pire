import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/fridge_item.dart';
import '../services/fridge_service.dart';
import '../services/ml_service.dart';

class ReceiptReviewScreen extends StatefulWidget {
  final List<RecognizedItem> items;

  const ReceiptReviewScreen({super.key, required this.items});

  @override
  State<ReceiptReviewScreen> createState() => _ReceiptReviewScreenState();
}

class _ReceiptReviewScreenState extends State<ReceiptReviewScreen> {
  final _dateFormat = DateFormat('MM/dd/yyyy');
  bool _isSaving = false;
  late final List<_ReceiptReviewItem> _reviewItems;

  @override
  void initState() {
    super.initState();
    _reviewItems = widget.items.map((item) {
      final name = (item.matchedProductName?.isNotEmpty ?? false)
          ? item.matchedProductName!
          : item.itemName;
      return _ReceiptReviewItem(
        nameController: TextEditingController(text: name),
        expiryDate: item.predictedExpiryDate,
        selected: true,
        source: item,
      );
    }).toList();
  }

  @override
  void dispose() {
    for (final item in _reviewItems) {
      item.nameController.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate(int index) async {
    final current = _reviewItems[index].expiryDate ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
    );

    if (picked != null) {
      setState(() {
        _reviewItems[index].expiryDate = picked;
      });
    }
  }

  Future<void> _confirmAndAdd() async {
    if (_isSaving) return;

    final selected = _reviewItems.where((item) => item.selected).toList();
    if (selected.isEmpty) {
      _showSnack('Select at least one item to add.');
      return;
    }

    for (final item in selected) {
      if (item.nameController.text.trim().isEmpty) {
        _showSnack('Item names cannot be empty.');
        return;
      }
      if (item.expiryDate == null) {
        _showSnack('Please pick an expiry date for all selected items.');
        return;
      }
    }

    setState(() => _isSaving = true);

    try {
      final fridgeService = context.read<FridgeService>();
      final now = DateTime.now();
      final itemsToAdd = selected.map((item) {
        return FridgeItem(
          itemId: '',
          itemName: item.nameController.text.trim(),
          itemLogDate: now,
          itemExpiryDate: item.expiryDate!,
          itemQuantity: 1,
        );
      }).toList();

      await fridgeService.addMultipleItems(itemsToAdd);
      if (mounted) {
        _showSnack('Added ${itemsToAdd.length} items.');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        _showSnack('Error adding items: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Review Receipt Items'),
      ),
      body: _reviewItems.isEmpty
          ? const Center(child: Text('No items found on this receipt.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _reviewItems.length,
              itemBuilder: (context, index) => _buildItemCard(index),
            ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: ElevatedButton.icon(
            onPressed: _isSaving ? null : _confirmAndAdd,
            icon: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check),
            label: Text(_isSaving ? 'Adding...' : 'Confirm and Add'),
          ),
        ),
      ),
    );
  }

  Widget _buildItemCard(int index) {
    final item = _reviewItems[index];
    final expiryLabel = item.expiryDate == null
        ? 'Pick date'
        : _dateFormat.format(item.expiryDate!);
    final confidenceText = (item.source.confidence != null)
        ? (item.source.confidence! * 100).toStringAsFixed(0)
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Checkbox(
                  value: item.selected,
                  onChanged: (value) {
                    setState(() => item.selected = value ?? true);
                  },
                ),
                Expanded(
                  child: TextField(
                    controller: item.nameController,
                    decoration: const InputDecoration(
                      labelText: 'Item name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.event, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Expiry date: $expiryLabel'),
                ),
                TextButton(
                  onPressed: () => _pickDate(index),
                  child: const Text('Edit'),
                ),
              ],
            ),
            if (confidenceText != null || item.source.storage != null) ...[
              const SizedBox(height: 6),
              Text(
                'Confidence: ${confidenceText ?? 'n/a'}% • Storage: ${item.source.storage ?? 'unknown'}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            if (item.source.sourceNote != null && item.source.sourceNote!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                item.source.sourceNote!,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReceiptReviewItem {
  final TextEditingController nameController;
  DateTime? expiryDate;
  bool selected;
  final RecognizedItem source;

  _ReceiptReviewItem({
    required this.nameController,
    required this.expiryDate,
    required this.selected,
    required this.source,
  });
}
