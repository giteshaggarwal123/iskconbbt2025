
#!/bin/bash

echo "🤖 Building ISKCON Bureau Portal for Android..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf android/app/src/main/assets/public/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🏗️ Building for production..."
npm run build

# Ensure Android platform is added
echo "📱 Adding Android platform..."
npx cap add android 2>/dev/null || echo "Android platform already exists"

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync android

# Update Android dependencies
echo "🔄 Updating Android dependencies..."
npx cap update android

# Fix gradlew permissions on Linux/macOS
echo "🔧 Setting gradlew permissions..."
if [ -f "android/gradlew" ]; then
    chmod +x android/gradlew
    echo "✅ gradlew permissions set"
else
    echo "⚠️ gradlew not found, this is normal for some Capacitor versions"
fi

# Fix line endings if on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Fixing line endings for Linux..."
    if command -v dos2unix &> /dev/null; then
        find android/ -name "gradlew" -exec dos2unix {} \;
        echo "✅ Line endings fixed"
    else
        echo "ℹ️ Install dos2unix for better compatibility: sudo apt install dos2unix"
    fi
fi

echo "✅ Android build complete!"
echo ""
echo "Next steps:"
echo "1. Run: npx cap open android"
echo "2. In Android Studio:"
echo "   - Clean Project (Build > Clean Project)"
echo "   - Rebuild Project (Build > Rebuild Project)"
echo "   - Make sure you have a connected device or emulator"
echo "   - Click the Run button"
echo ""
echo "If you still get 'App not found':"
echo "- Check that your device/emulator is connected"
echo "- Ensure USB debugging is enabled (for physical devices)"
echo "- Try running the app from Android Studio instead of command line"
