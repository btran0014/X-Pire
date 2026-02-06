import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';

class CameraService {
  final ImagePicker _picker = ImagePicker();

  /// Take a photo using the camera
  Future<XFile?> takePhoto() async {
    // Request camera permission
    final cameraStatus = await Permission.camera.request();
    
    if (!cameraStatus.isGranted) {
      throw Exception('Camera permission denied');
    }

    // For Android 13+ (API 33), also check photo permission
    if (Platform.isAndroid) {
      final androidVersion = await _getAndroidVersion();
      if (androidVersion >= 33) {
        final photoStatus = await Permission.photos.request();
        if (!photoStatus.isGranted) {
          throw Exception('Photo permission denied');
        }
      }
    }

    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );
      
      return photo;
    } catch (e) {
      throw Exception('Failed to capture photo: $e');
    }
  }

  /// Pick an image from gallery
  Future<XFile?> pickFromGallery() async {
    PermissionStatus status;
    
    if (Platform.isAndroid) {
      final androidVersion = await _getAndroidVersion();
      if (androidVersion >= 33) {
        status = await Permission.photos.request();
      } else {
        status = await Permission.storage.request();
      }
    } else {
      status = await Permission.photos.request();
    }

    if (!status.isGranted) {
      throw Exception('Gallery permission denied');
    }

    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      
      return image;
    } catch (e) {
      throw Exception('Failed to pick image: $e');
    }
  }

  /// Check if camera is available
  Future<bool> isCameraAvailable() async {
    try {
      final cameraStatus = await Permission.camera.status;
      return cameraStatus.isGranted;
    } catch (e) {
      return false;
    }
  }

  Future<int> _getAndroidVersion() async {
    // This is a simplified version. In production, you might want to use
    // device_info_plus package for accurate version detection
    return 33; // Assume modern Android for now
  }
}
