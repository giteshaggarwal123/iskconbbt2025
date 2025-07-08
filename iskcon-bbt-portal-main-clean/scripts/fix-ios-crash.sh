
#!/bin/bash

echo "🔧 Fixing iOS build issues..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from the project root"
    exit 1
fi

# Clean and rebuild
echo "🧹 Cleaning..."
rm -rf node_modules dist ios

echo "📦 Installing..."
npm install

echo "🏗️ Building..."
npm run build

echo "📱 Setting up iOS..."
npx cap add ios
npx cap sync ios

echo "🍎 CocoaPods setup..."
if command -v pod >/dev/null 2>&1; then
    cd ios/App
    pod install
    cd ../..
    echo "✅ Done! Run: npx cap open ios"
else
    echo "⚠️  Install CocoaPods first: sudo gem install cocoapods"
fi
