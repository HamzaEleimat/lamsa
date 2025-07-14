#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Platform Setup Script
 * Creates platform-specific directory structure and files
 */

const MOBILE_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(MOBILE_DIR, 'src');

const PLATFORM_STRUCTURE = {
  'components/ios': {
    'README.md': '# iOS-specific components\n\nPlace iOS-specific React Native components here.'
  },
  'components/android': {
    'README.md': '# Android-specific components\n\nPlace Android-specific React Native components here.'
  },
  'components/shared': {
    'README.md': '# Shared components\n\nPlace cross-platform React Native components here.'
  },
  'styles/platform': {
    'ios.ts': `// iOS-specific styles
import { StyleSheet } from 'react-native';

export const iosStyles = StyleSheet.create({
  // Add iOS-specific styles here
  container: {
    paddingTop: 20, // iOS status bar
  },
});
`,
    'android.ts': `// Android-specific styles
import { StyleSheet } from 'react-native';

export const androidStyles = StyleSheet.create({
  // Add Android-specific styles here
  container: {
    paddingTop: 10, // Android status bar
  },
});
`,
    'base.ts': `// Shared base styles
import { StyleSheet } from 'react-native';

export const baseStyles = StyleSheet.create({
  // Add shared styles here
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
`
  },
  'utils/platform': {
    'index.ts': `// Platform detection utilities
import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

export const platformSelect = <T>(options: {
  ios?: T;
  android?: T;
  web?: T;
  default?: T;
}): T | undefined => {
  if (isIOS && options.ios) return options.ios;
  if (isAndroid && options.android) return options.android;
  if (isWeb && options.web) return options.web;
  return options.default;
};

export const getStatusBarHeight = () => {
  return platformSelect({
    ios: 44,
    android: 24,
    default: 0,
  });
};
`,
    'permissions.ios.ts': `// iOS-specific permission handling
import { Platform } from 'react-native';

export const requestIOSPermissions = async () => {
  if (Platform.OS !== 'ios') return true;
  
  // Add iOS-specific permission requests here
  // Example: Camera, Photo Library, Location, etc.
  
  return true;
};
`,
    'permissions.android.ts': `// Android-specific permission handling
import { Platform, PermissionsAndroid } from 'react-native';

export const requestAndroidPermissions = async () => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ]);
    
    return Object.values(grants).every(
      grant => grant === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.warn('Permission request failed:', error);
    return false;
  }
};
`
  },
  'assets/platform': {
    'README.md': `# Platform-specific assets

## Directory Structure
- \`ios/\` - iOS-specific assets (App Store icons, iOS splash screens)
- \`android/\` - Android-specific assets (Play Store icons, Android splash screens)
- \`shared/\` - Cross-platform assets

## Asset Guidelines
- Use PNG for transparency, JPG for photos
- iOS icons: 1024x1024 for App Store, various sizes for app
- Android icons: 512x512 for Play Store, adaptive icons
- Test assets on both platforms for consistency
`
  }
};

function createDirectoryStructure() {
  console.log('🏗️  Creating platform-specific directory structure...');
  
  Object.entries(PLATFORM_STRUCTURE).forEach(([dirPath, files]) => {
    const fullDirPath = path.join(SRC_DIR, dirPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(fullDirPath)) {
      fs.mkdirSync(fullDirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
    
    // Create files
    Object.entries(files).forEach(([fileName, content]) => {
      const filePath = path.join(fullDirPath, fileName);
      
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        console.log(`📄 Created file: ${path.join(dirPath, fileName)}`);
      }
    });
  });
}

function updateGitignore() {
  const gitignorePath = path.join(MOBILE_DIR, '.gitignore');
  const platformIgnores = `
# Platform-specific build artifacts
/ios/build/
/android/app/build/
/android/.gradle/

# Platform-specific environment files
.env.ios
.env.android

# Xcode
*.xcworkspace
*.xcuserdata
DerivedData/

# Android Studio
.idea/
*.iml
local.properties
`;

  if (fs.existsSync(gitignorePath)) {
    const currentContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!currentContent.includes('Platform-specific build artifacts')) {
      fs.appendFileSync(gitignorePath, platformIgnores);
      console.log('📝 Updated .gitignore with platform-specific rules');
    }
  }
}

function createExampleComponents() {
  const exampleButtonIOS = `// Example iOS-specific button component
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
}

export default function ButtonIOS({ title, onPress }: ButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF', // iOS blue
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
`;

  const exampleButtonAndroid = `// Example Android-specific button component
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
}

export default function ButtonAndroid({ title, onPress }: ButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3', // Material blue
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    elevation: 2, // Android shadow
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});
`;

  const buttonIndexFile = `// Platform-specific button exports
export { default as ButtonIOS } from './ButtonIOS';
export { default as ButtonAndroid } from './ButtonAndroid';

// You can also create a unified button that selects platform automatically:
import { Platform } from 'react-native';
import ButtonIOS from './ButtonIOS';
import ButtonAndroid from './ButtonAndroid';

export const Button = Platform.select({
  ios: ButtonIOS,
  android: ButtonAndroid,
  default: ButtonIOS,
});
`;

  // Create example platform-specific components
  const iosComponentsDir = path.join(SRC_DIR, 'components/ios');
  const androidComponentsDir = path.join(SRC_DIR, 'components/android');
  
  fs.writeFileSync(path.join(iosComponentsDir, 'ButtonIOS.tsx'), exampleButtonIOS);
  fs.writeFileSync(path.join(androidComponentsDir, 'ButtonAndroid.tsx'), exampleButtonAndroid);
  fs.writeFileSync(path.join(SRC_DIR, 'components/platform-buttons.ts'), buttonIndexFile);
  
  console.log('🔧 Created example platform-specific components');
}

function main() {
  console.log('🚀 Setting up platform-specific structure for React Native app...');
  
  try {
    createDirectoryStructure();
    updateGitignore();
    createExampleComponents();
    
    console.log('\n✅ Platform setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review created directories and files');
    console.log('2. Add platform-specific components to ios/ and android/ directories');
    console.log('3. Use Platform.select() for runtime platform detection');
    console.log('4. Test on both iOS and Android devices');
    console.log('5. Commit changes to version control');
  } catch (error) {
    console.error('❌ Platform setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
