import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/fridge_item.dart';
import '../services/fridge_service.dart';
import '../screens/add_item_screen.dart';

class FridgeItemCard extends StatelessWidget {
  final FridgeItem item;

  const FridgeItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final fridgeService = context.read<FridgeService>();
    
    Color statusColor;
    String statusText;
    
    if (item.isExpired) {
      statusColor = Colors.red;
      statusText = 'Expired';
    } else if (item.isExpiringSoon) {
      statusColor = Colors.orange;
      statusText = '${item.daysUntilExpiry} days left';
    } else {
      statusColor = Colors.green;
      statusText = '${item.daysUntilExpiry} days left';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Icon(
            item.isExpired ? Icons.warning : Icons.kitchen,
            color: statusColor,
          ),
        ),
        title: Text(
          item.displayName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text('Expires: ${item.formattedExpiryDate}'),
            Text(
              statusText,
              style: TextStyle(color: statusColor, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Quantity badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'x${item.itemQuantity}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ),
            // More menu
            PopupMenuButton<String>(
              onSelected: (value) async {
                switch (value) {
                  case 'edit':
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => AddItemScreen(item: item),
                      ),
                    );
                    break;
                  case 'increase':
                    await fridgeService.increaseQuantity(item.itemId);
                    break;
                  case 'decrease':
                    await fridgeService.decreaseQuantity(item.itemId);
                    break;
                  case 'delete':
                    _showDeleteDialog(context, fridgeService);
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit),
                      SizedBox(width: 8),
                      Text('Edit'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'increase',
                  child: Row(
                    children: [
                      Icon(Icons.add),
                      SizedBox(width: 8),
                      Text('Increase Quantity'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'decrease',
                  child: Row(
                    children: [
                      Icon(Icons.remove),
                      SizedBox(width: 8),
                      Text('Decrease Quantity'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Delete', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, FridgeService fridgeService) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Item'),
        content: Text('Are you sure you want to delete "${item.displayName}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await fridgeService.deleteItem(item.itemId);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Item deleted'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
