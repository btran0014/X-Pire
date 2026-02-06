# X-Pire - Flutter Cross-Platform Version

A cross-platform fridge inventory management app with AI-powered expiry date detection, built with Flutter.

## 🚀 What Changed from Android Version

### ✅ **Fixed Issues**
- **Camera Integration**: Now properly working with full permission handling
- **AI/OCR Features**: Google ML Kit integration for automatic expiry date detection from photos
- **Cross-Platform**: Works on both iOS and Android from a single codebase

### 🎯 **New Features**
- **Smart Date Recognition**: Automatically extracts expiry dates from food labels/receipts
- **Multiple Date Formats**: Supports MM/DD/YYYY, DD/MM/YYYY, "Jan 15, 2026", "EXP: 01/15/2026", etc.
- **Visual Status Indicators**: Color-coded items (Expired: Red, Expiring Soon: Orange, Fresh: Green)
- **Quantity Management**: Increase/decrease quantities, auto-delete when quantity reaches 0
- **Cloud Sync**: Firebase Firestore integration for data persistence
- **Dark Mode Support**: Automatic theme switching

### 📱 **Platform Support**
- ✅ **Android** (API 21+)
- ✅ **iOS** (iOS 12+)

## 🏗️ Project Structure

```
lib/
├── main.dart                      # App entry point
├── firebase_options.dart          # Firebase configuration
├── models/
│   └── fridge_item.dart          # Data model (translated from Java)
├── screens/
│   ├── home_screen.dart          # Main screen (MainActivity equivalent)
│   ├── fridge_items_screen.dart  # List view (FridgeItemDisplay equivalent)
│   └── add_item_screen.dart      # Manual entry form
├── services/
│   ├── camera_service.dart       # Camera helper (CameraHelper equivalent - FIXED)
│   ├── ml_service.dart           # AI/OCR service (NEW - WORKING)
│   └── fridge_service.dart       # Firebase CRUD operations
└── widgets/
    └── fridge_item_card.dart     # List item card (FridgeItemAdapter equivalent)
```

## 🔧 Setup Instructions

### 1. Prerequisites
```bash
# Install Flutter SDK (3.0+)
# Download from: https://flutter.dev/docs/get-started/install

# Verify installation
flutter doctor
```

### 2. Install Dependencies
```bash
cd X-Pire
flutter pub get
```

### 3. Configure Firebase

#### Option A: Automatic (Recommended)
```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure Firebase
flutterfire configure
```

#### Option B: Manual
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add Android app:
   - Package name: `com.example.x_pire`
   - Download `google-services.json` → `android/app/`
4. Add iOS app:
   - Bundle ID: `com.example.xPire`
   - Download `GoogleService-Info.plist` → `ios/Runner/`
5. Update [lib/firebase_options.dart](lib/firebase_options.dart) with your config

### 4. Enable Firestore
1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Start in **test mode** (for development)
4. Update rules for production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fridge_items/{itemId} {
      allow read, write: if request.auth != null; // Add auth later
    }
  }
}
```

### 5. Run the App

#### Android
```bash
flutter run
```

#### iOS
```bash
cd ios
pod install
cd ..
flutter run
```

## 🎨 Key Improvements Over Original

| Feature | Original (Android/Java) | New (Flutter/Dart) |
|---------|------------------------|-------------------|
| **Camera** | ❌ Not working | ✅ Working with permissions |
| **AI/OCR** | ❌ Not implemented | ✅ Google ML Kit integrated |
| **Date Parsing** | Manual integer conversion | Smart DateTime handling |
| **UI** | XML layouts | Material Design 3 + Cupertino |
| **Platform** | Android only | iOS + Android |
| **State Management** | Manual | Provider pattern |
| **Database** | Local only (planned Firebase) | Cloud Firestore |

## 📦 Dependencies

- **firebase_core** & **cloud_firestore**: Backend database
- **image_picker** & **camera**: Photo capture
- **google_ml_kit**: OCR text recognition
- **permission_handler**: Cross-platform permissions
- **provider**: State management
- **intl**: Date formatting

## 🔍 How Camera + AI Works

1. **User taps "Scan with Camera"**
2. **CameraService** requests permissions (camera + photos)
3. **Image captured** using device camera
4. **MLService** processes image:
   - Extracts text using Google ML Kit
   - Parses multiple date formats with regex
   - Validates dates are reasonable (not in far past/future)
5. **Result shown** to user:
   - ✅ Success: Shows detected date
   - ⚠️ Manual entry needed: Shows extracted text for review
   - ❌ Error: Prompts retry

## 🧪 Testing

```bash
# Run tests
flutter test

# Run on specific device
flutter devices
flutter run -d <device-id>

# Build release APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

## 🐛 Troubleshooting

### Camera not working?
- Check permissions in `AndroidManifest.xml` and `Info.plist`
- Ensure physical device (emulators may not have cameras)

### Firebase errors?
- Verify `google-services.json` is in `android/app/`
- Verify `GoogleService-Info.plist` is in `ios/Runner/`
- Check Firestore rules allow read/write

### ML Kit crashes?
- Ensure Android minSdkVersion is 21+
- iOS deployment target is 12.0+

## 📝 Next Steps

- [ ] Add user authentication (Firebase Auth)
- [ ] Push notifications for expiring items
- [ ] Barcode scanning for products
- [ ] Recipe suggestions based on ingredients
- [ ] Shopping list generation

## 📄 License

Same as original X-Pire project.
