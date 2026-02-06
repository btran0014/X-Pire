# Setup Guide - X-Pire Flutter Migration

## Quick Start (5 minutes)

### 1. Install Flutter
```bash
# Windows (PowerShell as Administrator)
# Download Flutter SDK from: https://docs.flutter.dev/get-started/install/windows

# Add to PATH (update version as needed)
$env:Path += ";C:\src\flutter\bin"

# Verify
flutter doctor
```

### 2. Install Dependencies
```bash
cd "C:\Users\Ali Shafik\Documents\GitHub\X-Pire"
flutter pub get
```

### 3. Set Up Firebase (Choose One)

#### Option A: Quick Setup (FlutterFire CLI)
```bash
# Install FlutterFire
dart pub global activate flutterfire_cli

# Configure (follow prompts)
flutterfire configure --project=x-pire-fridge
```

#### Option B: Manual Setup
1. Keep your existing `app/google-services.json`
2. Copy it to the Flutter Android folder:
```powershell
Copy-Item "app\google-services.json" "android\app\google-services.json"
```
3. Update `lib/firebase_options.dart` with your Firebase project details from the Firebase Console

### 4. Run the App
```bash
# Connect Android device or start emulator
flutter devices

# Run
flutter run
```

## Detailed Setup

### Android Studio / VS Code Setup
1. Install Flutter extension
2. Run `flutter doctor` and fix any issues
3. Install Android SDK (API 34)
4. Set up Android emulator or connect physical device

### iOS Setup (Mac only)
```bash
cd ios
pod install
cd ..
flutter run
```

### Firebase Firestore Setup
1. Go to https://console.firebase.google.com
2. Select your project (or create new)
3. Go to **Firestore Database** → **Create Database**
4. Choose **Start in test mode**
5. Set rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fridge_items/{document} {
      allow read, write: if true; // For testing only
    }
  }
}
```

### Common Issues

**"Camera permission denied"**
- Enable permissions in device settings
- Check AndroidManifest.xml has camera permissions

**"Firebase not initialized"**
- Run `flutterfire configure`
- Verify google-services.json exists

**"gradle sync failed"**
- Update Android Studio
- Run `flutter clean && flutter pub get`

## Migration Notes

Your original Java code has been translated to:
- `FridgeItem.java` → `lib/models/fridge_item.dart`
- `MainActivity.java` → `lib/screens/home_screen.dart`
- `CameraHelper.java` → `lib/services/camera_service.dart` (FIXED & WORKING)
- `FridgeItemDisplay.java` → `lib/screens/fridge_items_screen.dart`
- `FridgeItemAdapter.java` → `lib/widgets/fridge_item_card.dart`

New additions:
- `lib/services/ml_service.dart` - AI-powered date detection (NEW)
- `lib/services/fridge_service.dart` - Firebase integration
- `lib/screens/add_item_screen.dart` - Manual entry form

## Build Commands

```bash
# Development
flutter run

# Release APK
flutter build apk --release

# Release iOS
flutter build ios --release

# Web (bonus!)
flutter build web
```
