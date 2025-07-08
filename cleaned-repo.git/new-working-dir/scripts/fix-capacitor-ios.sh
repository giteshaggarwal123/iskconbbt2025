
#!/bin/bash

echo "🔧 Fixing Capacitor iOS setup..."

# Ensure we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Step 1: Clean everything thoroughly
echo "🧹 Cleaning project..."
rm -rf node_modules/
rm -rf dist/
rm -rf ios/
rm -rf package-lock.json

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 3: Install Capacitor packages
echo "⚡ Installing Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Step 4: Build web app
echo "🏗️ Building web app..."
npm run build

# Step 5: Initialize Capacitor if needed
echo "⚡ Initializing Capacitor..."
if [ ! -f "capacitor.config.ts" ]; then
    npx cap init "ISKCON Management Portal" "com.iskcon.bbtportal" --web-dir=dist
fi

# Step 6: Add iOS platform
echo "📱 Adding iOS platform..."
npx cap add ios

# Step 7: Sync with iOS
echo "🔄 Syncing Capacitor..."
npx cap sync ios

# Step 8: Install CocoaPods
echo "🍎 Setting up CocoaPods..."
if command -v pod >/dev/null 2>&1; then
    cd ios/App
    pod install --repo-update
    cd ../..
else
    echo "⚠️  CocoaPods not installed. Please install it first:"
    echo "   sudo gem install cocoapods"
fi

echo "✅ Capacitor iOS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. If CocoaPods wasn't installed, install it and run: cd ios/App && pod install"
echo "2. Run: npx cap open ios"
echo "3. In Xcode:"
echo "   - Clean Build Folder (Cmd+Shift+K)"
echo "   - Set Development Team in Signing & Capabilities"
echo "   - Set Deployment Target to iOS 13.0 or higher"
echo "   - Build and run the project"
