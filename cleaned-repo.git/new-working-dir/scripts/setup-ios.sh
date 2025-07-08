
#!/bin/bash

echo "🍎 Setting up iOS project for ISKCON Management Portal..."

# Ensure we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Remove existing iOS project to start fresh
echo "🧹 Cleaning existing iOS project..."
rm -rf ios/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Add iOS platform
echo "📱 Adding iOS platform..."
npx cap add ios

# Build the web app
echo "🏗️ Building web app..."
npm run build

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Install CocoaPods dependencies
echo "📱 Installing CocoaPods dependencies..."
cd ios/App
pod install --repo-update
cd ../..

echo "✅ iOS setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npx cap open ios"
echo "2. In Xcode, set your Team and Bundle Identifier"
echo "3. Configure signing certificates"
echo "4. Build and run your app"

