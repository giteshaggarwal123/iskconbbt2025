
#!/bin/bash

echo "🚀 Building ISKCON Management Portal for mobile deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf android/app/src/main/assets/public/
rm -rf ios/App/App/public/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🏗️ Building for production..."
npm run build

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync

echo "✅ Build complete! Ready for mobile deployment."
echo ""
echo "Next steps:"
echo "1. For Android: npx cap open android"
echo "2. For iOS: npx cap open ios"
echo "3. Build and test in Android Studio / Xcode"
echo "4. Generate signed APK/IPA for store submission"
