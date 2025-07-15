/**
 * Custom Test Sequencer
 * Optimizes test execution order for better performance
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Sort tests to run faster ones first and group related tests
   */
  sort(tests) {
    // Group tests by type and priority
    const testGroups = {
      unit: [],
      integration: [],
      e2e: [],
      performance: []
    };
    
    // Categorize tests
    tests.forEach(test => {
      if (test.path.includes('/unit/')) {
        testGroups.unit.push(test);
      } else if (test.path.includes('/integration/')) {
        testGroups.integration.push(test);
      } else if (test.path.includes('/e2e/')) {
        testGroups.e2e.push(test);
      } else if (test.path.includes('/performance/')) {
        testGroups.performance.push(test);
      } else {
        testGroups.unit.push(test);
      }
    });
    
    // Sort within each group by estimated execution time
    Object.keys(testGroups).forEach(group => {
      testGroups[group].sort((a, b) => {
        // Prioritize shorter tests first
        const aWeight = this.getTestWeight(a);
        const bWeight = this.getTestWeight(b);
        return aWeight - bWeight;
      });
    });
    
    // Return tests in optimal order: unit -> integration -> e2e -> performance
    return [
      ...testGroups.unit,
      ...testGroups.integration,
      ...testGroups.e2e,
      ...testGroups.performance
    ];
  }
  
  /**
   * Estimate test execution time based on file name patterns
   */
  getTestWeight(test) {
    const path = test.path;
    
    // Higher weight = runs later
    if (path.includes('performance')) return 1000;
    if (path.includes('e2e')) return 500;
    if (path.includes('integration')) return 300;
    if (path.includes('booking')) return 200; // Booking tests are complex
    if (path.includes('auth')) return 150;
    if (path.includes('concurrent')) return 400;
    if (path.includes('load')) return 600;
    
    return 100; // Default weight for unit tests
  }
}

module.exports = CustomSequencer;