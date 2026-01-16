export default {
  expo: {
    name: "Masterly",
    slug: "masterly",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "mathgpt",

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#2563EB"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mathgpt.app"
    },

    android: {
      label: "Masterly",             
      package: "com.mathgpt.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2563EB"
      }
    },

    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },

    plugins: ["expo-router"],

    extra: {
      apiUrl: "https://api.masterly.co.in"
    }
  }
};
