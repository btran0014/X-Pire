import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'dart:io';
import 'fridge_items_screen.dart';
import 'receipt_review_screen.dart';
import '../services/camera_service.dart';
import '../services/ml_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final CameraService _cameraService = CameraService();
  final MLService _mlService = MLService();
  bool _isProcessing = false;

  @override
  void dispose() {
    _mlService.dispose();
    super.dispose();
  }

  Future<void> _openCamera() async {
    setState(() => _isProcessing = true);

    try {
      final image = await _cameraService.takePhoto();
      
      if (image != null && mounted) {
        final recognizedItems = await _mlService.processReceiptImage(image.path);
        if (!mounted) return;

        if (recognizedItems.isEmpty) {
          _showErrorDialog('No items detected on the receipt. Please try again.');
          return;
        }

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ReceiptReviewScreen(items: recognizedItems),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        _showErrorDialog('Error: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _navigateToFridgeItems() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const FridgeItemsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('X-Pire'),
        leading: const Icon(Icons.kitchen),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.kitchen_outlined,
                size: 120,
                color: Theme.of(context).primaryColor.withValues(alpha: 0.6),
              ),
              const SizedBox(height: 32),
              const Text(
                'Track Your Fridge Items',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                'Never let food go to waste again',
                style: TextStyle(fontSize: 16, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              
              // Camera Button
              _buildActionButton(
                context: context,
                icon: Platform.isIOS ? CupertinoIcons.camera : Icons.add_a_photo,
                label: 'Scan Receipt',
                subtitle: 'Find items and predict expiry dates',
                onPressed: _isProcessing ? null : _openCamera,
                isPrimary: true,
              ),
              
              const SizedBox(height: 16),
              
              // Manual Entry Button
              _buildActionButton(
                context: context,
                icon: Platform.isIOS ? CupertinoIcons.list_bullet : Icons.format_list_bulleted,
                label: 'View Fridge Items',
                subtitle: 'Add or manage items manually',
                onPressed: _isProcessing ? null : _navigateToFridgeItems,
                isPrimary: false,
              ),
              
              if (_isProcessing) ...[
                const SizedBox(height: 24),
                const CircularProgressIndicator(),
                const SizedBox(height: 8),
                const Text('Processing image...'),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String subtitle,
    required VoidCallback? onPressed,
    required bool isPrimary,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 80,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isPrimary
              ? Theme.of(context).primaryColor
              : Theme.of(context).colorScheme.secondary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 2,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32),
            const SizedBox(width: 16),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
