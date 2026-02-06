import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/fridge_service.dart';
import '../widgets/fridge_item_card.dart';
import 'add_item_screen.dart';

class FridgeItemsScreen extends StatefulWidget {
  const FridgeItemsScreen({super.key});

  @override
  State<FridgeItemsScreen> createState() => _FridgeItemsScreenState();
}

class _FridgeItemsScreenState extends State<FridgeItemsScreen> {
  @override
  void initState() {
    super.initState();
    // Load items when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FridgeService>().loadItems();
    });
  }

  void _showAddItemDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AddItemScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fridge Items'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<FridgeService>().loadItems(),
          ),
        ],
      ),
      body: Consumer<FridgeService>(
        builder: (context, fridgeService, child) {
          if (fridgeService.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (fridgeService.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(fridgeService.error!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => fridgeService.loadItems(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final items = fridgeService.sortedItems;

          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.shopping_cart_outlined,
                    size: 100,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No items in your fridge',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap + to add items',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          // Group items by status
          final expiredItems = items.where((item) => item.isExpired).toList();
          final expiringSoonItems = items.where((item) => item.isExpiringSoon).toList();
          final freshItems = items.where((item) => !item.isExpired && !item.isExpiringSoon).toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (expiredItems.isNotEmpty) ...[
                _buildSectionHeader('Expired', Colors.red, expiredItems.length),
                ...expiredItems.map((item) => FridgeItemCard(item: item)),
                const SizedBox(height: 16),
              ],
              if (expiringSoonItems.isNotEmpty) ...[
                _buildSectionHeader('Expiring Soon', Colors.orange, expiringSoonItems.length),
                ...expiringSoonItems.map((item) => FridgeItemCard(item: item)),
                const SizedBox(height: 16),
              ],
              if (freshItems.isNotEmpty) ...[
                _buildSectionHeader('Fresh', Colors.green, freshItems.length),
                ...freshItems.map((item) => FridgeItemCard(item: item)),
              ],
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddItemDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add Item'),
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color, int count) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$title ($count)',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
