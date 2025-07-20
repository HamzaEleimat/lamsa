#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Version Bump Script for React Native Expo App
 * Handles semantic versioning and build number increments
 */

const VERSION_FILE = path.join(__dirname, '..', 'version.json');
const APP_JSON_FILE = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_FILE = path.join(__dirname, '..', 'package.json');

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    process.exit(1);
  }
}

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0]; // major, minor, patch
  const platform = args[1]; // ios, android, both
  const channel = args[2]; // production, beta, staging
  
  if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Usage: node version-bump.js <major|minor|patch> [ios|android|both] [production|beta|staging]');
    process.exit(1);
  }

  // Read current version data
  const versionData = readJsonFile(VERSION_FILE);
  const appJson = readJsonFile(APP_JSON_FILE);
  const packageJson = readJsonFile(PACKAGE_JSON_FILE);

  // Increment version
  const newVersion = incrementVersion(versionData.version, versionType);
  console.log(`Bumping version from ${versionData.version} to ${newVersion}`);

  // Update version data
  versionData.version = newVersion;
  versionData.lastUpdated = new Date().toISOString();

  // Increment build numbers
  if (!platform || platform === 'ios' || platform === 'both') {
    versionData.buildNumber.ios += 1;
    console.log(`iOS build number incremented to ${versionData.buildNumber.ios}`);
  }
  
  if (!platform || platform === 'android' || platform === 'both') {
    versionData.buildNumber.android += 1;
    console.log(`Android build number incremented to ${versionData.buildNumber.android}`);
  }

  // Update channel if specified
  if (channel && ['production', 'beta', 'staging'].includes(channel)) {
    versionData.channels[channel] = newVersion;
    console.log(`Updated ${channel} channel to ${newVersion}`);
  }

  // Update app.json
  appJson.expo.version = newVersion;
  if (appJson.expo.ios) {
    appJson.expo.ios.buildNumber = versionData.buildNumber.ios.toString();
  } else {
    appJson.expo.ios = { buildNumber: versionData.buildNumber.ios.toString() };
  }
  
  if (appJson.expo.android) {
    appJson.expo.android.versionCode = versionData.buildNumber.android;
  } else {
    appJson.expo.android = { versionCode: versionData.buildNumber.android };
  }

  // Update runtime version for OTA updates
  if (versionType === 'major') {
    versionData.expo.runtimeVersion = newVersion;
    appJson.expo.runtimeVersion = newVersion;
  }

  // Update package.json
  packageJson.version = newVersion;

  // Write all files
  writeJsonFile(VERSION_FILE, versionData);
  writeJsonFile(APP_JSON_FILE, appJson);
  writeJsonFile(PACKAGE_JSON_FILE, packageJson);

  console.log('✅ Version bump completed successfully!');
  console.log(`📱 New version: ${newVersion}`);
  console.log(`🍎 iOS build: ${versionData.buildNumber.ios}`);
  console.log(`🤖 Android build: ${versionData.buildNumber.android}`);
}

if (require.main === module) {
  main();
}

module.exports = { incrementVersion, readJsonFile, writeJsonFile };
