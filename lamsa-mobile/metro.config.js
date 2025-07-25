const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve modules that don't work on web
config.resolver.alias = {
  // Map react-native-maps to web-compatible version
  'react-native-maps': 'react-native-web-maps',
};

// Add resolver configuration for better module resolution
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'invariant') {
    return {
      filePath: require.resolve('invariant'),
      type: 'sourceFile',
    };
  }
  
  // Let Metro handle other modules
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure node_modules are properly resolved
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
];

// Reset cache on start
config.resetCache = true;

module.exports = config;