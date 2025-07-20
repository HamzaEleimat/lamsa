#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Release Notes Generator
 * Generates release notes from git commits between versions
 */

const VERSION_FILE = path.join(__dirname, '..', 'version.json');

function readJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function getGitCommits(fromTag, toTag = 'HEAD') {
  try {
    const command = `git log ${fromTag}..${toTag} --pretty=format:"%h - %s (%an)" --grep="^feat\\|^fix\\|^perf\\|^refactor" --grep="^Merge" --invert-grep`;
    const output = execSync(command, { encoding: 'utf8' }).trim();
    return output ? output.split('\n') : [];
  } catch (error) {
    console.warn('Warning: Could not get git commits:', error.message);
    return [];
  }
}

function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    others: []
  };

  commits.forEach(commit => {
    const lower = commit.toLowerCase();
    if (lower.includes('feat') || lower.includes('add') || lower.includes('new')) {
      categories.features.push(commit);
    } else if (lower.includes('fix') || lower.includes('bug')) {
      categories.fixes.push(commit);
    } else if (lower.includes('improve') || lower.includes('enhance') || lower.includes('perf')) {
      categories.improvements.push(commit);
    } else {
      categories.others.push(commit);
    }
  });

  return categories;
}

function generateReleaseNotes(version, categories) {
  let notes = [];

  if (categories.features.length > 0) {
    notes.push('✨ New Features:');
    categories.features.forEach(commit => notes.push(`  • ${commit}`));
    notes.push('');
  }

  if (categories.fixes.length > 0) {
    notes.push('🐛 Bug Fixes:');
    categories.fixes.forEach(commit => notes.push(`  • ${commit}`));
    notes.push('');
  }

  if (categories.improvements.length > 0) {
    notes.push('⚡ Improvements:');
    categories.improvements.forEach(commit => notes.push(`  • ${commit}`));
    notes.push('');
  }

  if (categories.others.length > 0) {
    notes.push('🔧 Other Changes:');
    categories.others.forEach(commit => notes.push(`  • ${commit}`));
  }

  return notes.join('\n').trim() || 'Minor updates and improvements';
}

function main() {
  const args = process.argv.slice(2);
  const version = args[0];
  const fromTag = args[1];

  if (!version) {
    console.error('Usage: node release-notes.js <version> [from-tag]');
    console.error('Example: node release-notes.js 1.1.0 v1.0.0');
    process.exit(1);
  }

  // Read current version data
  const versionData = readJsonFile(VERSION_FILE);

  // Get commits since last version
  const lastTag = fromTag || `v${Object.keys(versionData.releaseNotes).pop()}`;
  console.log(`Generating release notes for ${version} since ${lastTag}...`);

  const commits = getGitCommits(lastTag);
  const categories = categorizeCommits(commits);
  const releaseNotes = generateReleaseNotes(version, categories);

  // Update version data with release notes
  versionData.releaseNotes[version] = releaseNotes;
  writeJsonFile(VERSION_FILE, versionData);

  console.log('✅ Release notes generated successfully!');
  console.log('\n📝 Release Notes:');
  console.log('================');
  console.log(releaseNotes);
}

if (require.main === module) {
  main();
}

module.exports = { categorizeCommits, generateReleaseNotes };
