
#!/bin/bash

echo "🍎 Deploying iOS app..."

# Build the project
./scripts/build-mobile.sh

# Open Xcode
echo "🔧 Opening Xcode..."
npx cap open ios

echo "📝 Manual steps required in Xcode:"
echo "1. Set your Team and Bundle Identifier"
echo "2. Configure signing certificates"
echo "3. Archive the app (Product → Archive)"
echo "4. Upload to App Store Connect"
echo "5. Submit for review through App Store Connect"
</lov-script>

Now let's add the mobile deployment dependencies:

<lov-add-dependency>@capacitor/ios@latest</lov-add-dependency>

<lov-add-dependency>@capacitor/keyboard@latest</lov-add-dependency>

<lov-add-dependency>@capacitor/app@latest</lov-add-dependency>

<lov-add-dependency>@capacitor/haptics@latest</lov-add-dependency>

<lov-add-dependency>@capacitor/status-bar@latest</lov-add-dependency>

<lov-add-dependency>@capacitor/splash-screen@latest</lov-add-dependency>

Let's also update the package.json scripts for mobile deployment:

<lov-write file_path="package.json">
{
  "name": "iskcon-management-portal",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "mobile:build": "chmod +x scripts/build-mobile.sh && ./scripts/build-mobile.sh",
    "mobile:android": "chmod +x scripts/deploy-android.sh && ./scripts/deploy-android.sh",
    "mobile:ios": "chmod +x scripts/deploy-ios.sh && ./scripts/deploy-ios.sh",
    "cap:sync": "cap sync",
    "cap:open:android": "cap open android",
    "cap:open:ios": "cap open ios",
    "cap:run:android": "cap run android",
    "cap:run:ios": "cap run ios"
  }
}
