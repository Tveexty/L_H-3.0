plugins {
    id("com.android.application") version "8.5.0"
    id("org.jetbrains.kotlin.android") version "1.9.24"
}

android {
    namespace = "com.lumaos.oxygenconnect"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.lumaos.oxygenconnect"
        minSdk = 24
        targetSdk = 34
        versionCode = 170
        versionName = "1.7.0-Oxygen"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
