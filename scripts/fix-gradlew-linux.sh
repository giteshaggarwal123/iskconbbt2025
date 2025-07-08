
#!/bin/bash

echo "🐧 Fixing gradlew issues on Linux..."

# Navigate to android directory
cd android || { echo "❌ Android directory not found"; exit 1; }

# Set execute permissions
if [ -f "gradlew" ]; then
    chmod +x gradlew
    echo "✅ Set execute permissions for gradlew"
else
    echo "❌ gradlew file not found"
    exit 1
fi

# Fix line endings if dos2unix is available
if command -v dos2unix &> /dev/null; then
    dos2unix gradlew
    echo "✅ Fixed line endings"
else
    echo "ℹ️ Consider installing dos2unix: sudo apt install dos2unix"
fi

# Try to run gradlew to test
echo "🧪 Testing gradlew..."
./gradlew --version

if [ $? -eq 0 ]; then
    echo "✅ gradlew is working correctly!"
else
    echo "❌ gradlew still has issues. Check Android SDK installation."
    echo ""
    echo "Make sure you have:"
    echo "1. Android Studio installed"
    echo "2. ANDROID_HOME environment variable set"
    echo "3. Android SDK and build tools installed"
    echo ""
    echo "Add to your ~/.bashrc or ~/.zshrc:"
    echo "export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
fi

cd ..
