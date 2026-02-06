# X-Pire

Cross-platform fridge inventory app built with Flutter. Capture photos to extract expiry dates and manage items with cloud sync.

## Features
- Camera capture with permissions
- OCR date detection using ML Kit
- Expiry status and quantity tracking
- Firebase Firestore storage
- Android and iOS support

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
