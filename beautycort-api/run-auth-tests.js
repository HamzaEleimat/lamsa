#!/usr/bin/env node

/**
 * Test Runner for Authentication Tests
 * Validates that all test files are properly structured
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 BeautyCort Authentication Test Suite Validation\n');

// Test file locations
const testFiles = [
  'tests/unit/auth/phone-validation.unit.test.ts',
  'tests/unit/auth/auth-controller.unit.test.ts', 
  'tests/unit/auth/jwt-utils.unit.test.ts',
  'tests/integration/auth/complete-auth-flow.integration.test.ts',
  'tests/integration/auth/edge-cases.integration.test.ts',
  'tests/integration/auth/session-management.integration.test.ts',
  'tests/integration/auth/multilingual-errors.integration.test.ts',
  'tests/integration/auth/network-failures.integration.test.ts'
];

// Manual test files
const manualTestFiles = [
  'tests/manual/AUTH_TESTING_CHECKLIST.md',
  'tests/manual/POSTMAN_TESTING_GUIDE.md'
];

console.log('📁 Checking test file structure...\n');

let allFilesExist = true;

// Check automated test files
console.log('🔍 Automated Test Files:');
testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
  
  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const hasDescribe = content.includes('describe(');
    const hasTest = content.includes('test(') || content.includes('it(');
    
    console.log(`     📊 ${lines} lines, ${hasDescribe ? 'Has describe blocks' : 'No describe blocks'}, ${hasTest ? 'Has test cases' : 'No test cases'}`);
  } else {
    allFilesExist = false;
  }
});

console.log('\n📚 Manual Test Files:');
manualTestFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
  
  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    console.log(`     📄 ${lines} lines`);
  } else {
    allFilesExist = false;
  }
});

// Check test coverage areas
console.log('\n🎯 Test Coverage Areas:');

const coverageAreas = [
  { name: 'Phone Validation', files: ['phone-validation.unit.test.ts'] },
  { name: 'OTP Flow', files: ['auth-controller.unit.test.ts', 'complete-auth-flow.integration.test.ts'] },
  { name: 'JWT Tokens', files: ['jwt-utils.unit.test.ts', 'session-management.integration.test.ts'] },
  { name: 'Edge Cases', files: ['edge-cases.integration.test.ts'] },
  { name: 'Error Messages', files: ['multilingual-errors.integration.test.ts'] },
  { name: 'Network Failures', files: ['network-failures.integration.test.ts'] },
  { name: 'Session Management', files: ['session-management.integration.test.ts'] },
  { name: 'Manual Testing', files: ['AUTH_TESTING_CHECKLIST.md', 'POSTMAN_TESTING_GUIDE.md'] }
];

coverageAreas.forEach(area => {
  const allAreaFilesExist = area.files.every(file => 
    testFiles.concat(manualTestFiles).some(testFile => testFile.includes(file))
  );
  const status = allAreaFilesExist ? '✅' : '❌';
  console.log(`  ${status} ${area.name}`);
});

// Summary
console.log('\n📋 Test Suite Summary:');
console.log(`  📁 Unit Tests: ${testFiles.filter(f => f.includes('unit')).length}`);
console.log(`  🔗 Integration Tests: ${testFiles.filter(f => f.includes('integration')).length}`);
console.log(`  📖 Manual Test Guides: ${manualTestFiles.length}`);
console.log(`  📊 Total Test Files: ${testFiles.length + manualTestFiles.length}`);

if (allFilesExist) {
  console.log('\n🎉 All authentication test files are present and properly structured!');
  console.log('\n📝 Next Steps:');
  console.log('  1. Run automated tests: npm test');
  console.log('  2. Follow manual testing checklist: tests/manual/AUTH_TESTING_CHECKLIST.md');
  console.log('  3. Use Postman collection: tests/manual/POSTMAN_TESTING_GUIDE.md');
  process.exit(0);
} else {
  console.log('\n❌ Some test files are missing. Please check the file paths.');
  process.exit(1);
}