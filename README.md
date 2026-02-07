# X-Pire

Cross-platform fridge inventory app built with Flutter. Capture photos of receipts to extract food items and automatically predict expiry dates based on food type.

## Features
- **Receipt Capture**: Take photos of shopping receipts with camera
- **AI-Powered Item Extraction**: Uses ML Kit OCR to read and extract all food items from receipts
- **Smart Expiry Prediction**: Automatically predicts expiry dates based on food type (dairy, meat, produce, etc.)
- **Batch Processing**: Add multiple items from a single receipt in one go
- **Expiry Tracking**: Monitor expiry status and quantities for all items
- **Cloud Sync**: Stores all data in Firebase Firestore for persistence across devices
- **Android and iOS support**

## How It Works
1. Take a photo of your shopping receipt
2. The app extracts all readable food items using OCR
3. For each item, the app predicts a reasonable expiry date based on food type (e.g., milk = 7 days, cheese = 30 days, canned goods = 365 days)
4. Review the extracted items and expiry dates
5. Approve and add all items to your fridge inventory with a single tap
6. Receive alerts as items approach their expiry dates

## Project Structure
```
lib/
   main.dart
   firebase_options.dart
   models/
   screens/
   services/
   widgets/
```

## Setup
1. Install Flutter: https://flutter.dev/docs/get-started/install
2. Install deps:
```bash
flutter pub get
```
3. Configure Firebase (recommended):
```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

## Run
```bash
flutter run
```
