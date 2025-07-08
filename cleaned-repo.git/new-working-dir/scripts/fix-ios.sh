
#!/bin/bash

echo "🔧 Fixing iOS build issues..."

# Ensure we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Clean everything
echo "🧹 Cleaning build artifacts..."
rm -rf node_modules/
rm -rf dist/
rm -rf ios/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the web app
echo "🏗️ Building web app..."
npm run build

# Add iOS platform
echo "📱 Adding iOS platform..."
npx cap add ios

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Install CocoaPods dependencies
echo "📱 Installing CocoaPods dependencies..."
cd ios/App
pod deintegrate
pod install --repo-update
cd ../..

echo "✅ iOS fixes applied!"
echo ""
echo "Next steps:"
echo "1. Run: npx cap open ios"
echo "2. In Xcode, clean the build folder (Cmd+Shift+K)"
echo "3. Set your Team and Bundle Identifier in Xcode"
echo "4. Try building again"
