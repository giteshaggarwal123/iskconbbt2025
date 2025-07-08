
#!/bin/bash

echo "🤖 Deploying Android app..."

# Build the project
./scripts/build-mobile.sh

# Open Android Studio
echo "🔧 Opening Android Studio..."
npx cap open android

echo "📝 Manual steps required in Android Studio:"
echo "1. Build → Generate Signed Bundle/APK"
echo "2. Select 'Android App Bundle' for Play Store"
echo "3. Create/select your keystore"
echo "4. Upload the generated .aab file to Google Play Console"
