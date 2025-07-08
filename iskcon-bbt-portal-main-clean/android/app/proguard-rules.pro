
# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# Keep WebView JavaScript Bridge
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep all classes that might be referenced by JavaScript
-keep class ** {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# Prevent obfuscation of classes used by Capacitor
-keep class androidx.** { *; }
-keep class android.webkit.** { *; }

# Keep Application class if you have one
-keep public class * extends android.app.Application

# Remove debug logs in release
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}
