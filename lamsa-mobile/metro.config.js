const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve modules that don't work on web
config.resolver.alias = {
  // Map react-native-maps to web-compatible version
  'react-native-maps': 'react-native-web-maps',
};

// Ensure node_modules are properly resolved
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
];

// Add node_modules to resolver search paths
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Ensure assets are resolved correctly
config.resolver.assetExts = [...config.resolver.assetExts, 'db'];

// Ensure source extensions are handled
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx'];

// Clear Metro cache
config.resetCache = true;

// Increase transformer timeout for slow builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;