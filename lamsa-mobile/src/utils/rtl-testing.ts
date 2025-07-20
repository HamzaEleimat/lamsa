/**
 * RTL Testing Utilities
 * Provides comprehensive testing tools for RTL layout validation
 */

import { I18nManager } from 'react-native';
import { isRTL } from '../i18n';

interface RTLTestResult {
  passed: boolean;
  message: string;
  expected: any;
  actual: any;
}

interface RTLTestSuite {
  testName: string;
  results: RTLTestResult[];
  passed: number;
  failed: number;
  total: number;
}

class RTLTester {
  private currentSuite: RTLTestSuite | null = null;
  private allSuites: RTLTestSuite[] = [];

  // Start a new test suite
  startTestSuite(testName: string): void {
    this.currentSuite = {
      testName,
      results: [],
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  // End current test suite and add to results
  endTestSuite(): RTLTestSuite | null {
    if (this.currentSuite) {
      this.allSuites.push(this.currentSuite);
      const suite = this.currentSuite;
      this.currentSuite = null;
      return suite;
    }
    return null;
  }

  // Add a test result
  private addResult(result: RTLTestResult): void {
    if (!this.currentSuite) {
      throw new Error('No active test suite. Call startTestSuite() first.');
    }

    this.currentSuite.results.push(result);
    this.currentSuite.total++;
    
    if (result.passed) {
      this.currentSuite.passed++;
    } else {
      this.currentSuite.failed++;
    }
  }

  // Test RTL state
  testRTLState(expected: boolean, message: string = 'RTL state'): void {
    const actual = isRTL();
    this.addResult({
      passed: actual === expected,
      message,
      expected,
      actual
    });
  }

  // Test text alignment
  testTextAlignment(
    textAlign: 'left' | 'right' | 'center' | 'justify',
    expectedInRTL: 'left' | 'right' | 'center' | 'justify',
    expectedInLTR: 'left' | 'right' | 'center' | 'justify',
    message: string = 'Text alignment'
  ): void {
    const expected = isRTL() ? expectedInRTL : expectedInLTR;
    this.addResult({
      passed: textAlign === expected,
      message,
      expected,
      actual: textAlign
    });
  }

  // Test flex direction
  testFlexDirection(
    flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse',
    expectedInRTL: 'row' | 'row-reverse' | 'column' | 'column-reverse',
    expectedInLTR: 'row' | 'row-reverse' | 'column' | 'column-reverse',
    message: string = 'Flex direction'
  ): void {
    const expected = isRTL() ? expectedInRTL : expectedInLTR;
    this.addResult({
      passed: flexDirection === expected,
      message,
      expected,
      actual: flexDirection
    });
  }

  // Test margin/padding properties
  testSpacing(
    style: any,
    property: 'marginLeft' | 'marginRight' | 'paddingLeft' | 'paddingRight',
    expectedInRTL: number,
    expectedInLTR: number,
    message: string = 'Spacing property'
  ): void {
    const expected = isRTL() ? expectedInRTL : expectedInLTR;
    const actual = style[property] || 0;
    this.addResult({
      passed: actual === expected,
      message: `${message} (${property})`,
      expected,
      actual
    });
  }

  // Test position properties
  testPosition(
    style: any,
    property: 'left' | 'right',
    expectedInRTL: number,
    expectedInLTR: number,
    message: string = 'Position property'
  ): void {
    const expected = isRTL() ? expectedInRTL : expectedInLTR;
    const actual = style[property] || 0;
    this.addResult({
      passed: actual === expected,
      message: `${message} (${property})`,
      expected,
      actual
    });
  }

  // Test border properties
  testBorder(
    style: any,
    property: 'borderLeftWidth' | 'borderRightWidth' | 'borderLeftColor' | 'borderRightColor',
    expectedInRTL: any,
    expectedInLTR: any,
    message: string = 'Border property'
  ): void {
    const expected = isRTL() ? expectedInRTL : expectedInLTR;
    const actual = style[property];
    this.addResult({
      passed: actual === expected,
      message: `${message} (${property})`,
      expected,
      actual
    });
  }

  // Test transform properties
  testTransform(
    transform: any[],
    expectedInRTL: any[],
    expectedInLTR: any[],
    message: string = 'Transform property'
  ): void {
    const expected = isRTL() ? expectedInRTL : expectedInLTR;
    const passed = JSON.stringify(transform) === JSON.stringify(expected);
    this.addResult({
      passed,
      message,
      expected,
      actual: transform
    });
  }

  // Test icon rotation
  testIconRotation(
    iconName: string,
    transform: any[],
    message: string = 'Icon rotation'
  ): void {
    const shouldRotate = [
      'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right',
      'caret-left', 'caret-right', 'angle-left', 'angle-right',
      'back', 'forward', 'next', 'previous'
    ].some(name => iconName.includes(name));

    const hasScaleTransform = transform.some(t => t.scaleX === -1);
    const expected = isRTL() && shouldRotate;
    
    this.addResult({
      passed: hasScaleTransform === expected,
      message: `${message} (${iconName})`,
      expected: expected ? 'rotated' : 'not rotated',
      actual: hasScaleTransform ? 'rotated' : 'not rotated'
    });
  }

  // Test component RTL compliance
  testComponentRTL(
    component: any,
    expectedProperties: string[],
    message: string = 'Component RTL compliance'
  ): void {
    const missingProperties = expectedProperties.filter(prop => 
      component.props?.style && !component.props.style.hasOwnProperty(prop)
    );
    
    this.addResult({
      passed: missingProperties.length === 0,
      message,
      expected: `All properties: ${expectedProperties.join(', ')}`,
      actual: `Missing: ${missingProperties.join(', ') || 'none'}`
    });
  }

  // Get all test results
  getAllResults(): RTLTestSuite[] {
    return this.allSuites;
  }

  // Get summary of all tests
  getSummary(): {
    totalSuites: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    successRate: number;
  } {
    const totalSuites = this.allSuites.length;
    const totalTests = this.allSuites.reduce((sum, suite) => sum + suite.total, 0);
    const totalPassed = this.allSuites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.allSuites.reduce((sum, suite) => sum + suite.failed, 0);
    const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    return {
      totalSuites,
      totalTests,
      totalPassed,
      totalFailed,
      successRate
    };
  }

  // Print results to console
  printResults(): void {
    console.log('\n🧪 RTL Testing Results');
    console.log('========================\n');

    this.allSuites.forEach(suite => {
      console.log(`📋 ${suite.testName}`);
      console.log(`   Passed: ${suite.passed}/${suite.total} (${((suite.passed / suite.total) * 100).toFixed(1)}%)`);
      
      if (suite.failed > 0) {
        console.log(`   Failed tests:`);
        suite.results
          .filter(result => !result.passed)
          .forEach(result => {
            console.log(`   ❌ ${result.message}`);
            console.log(`      Expected: ${result.expected}`);
            console.log(`      Actual: ${result.actual}`);
          });
      }
      console.log('');
    });

    const summary = this.getSummary();
    console.log(`📊 Overall Summary:`);
    console.log(`   Test Suites: ${summary.totalSuites}`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.totalPassed}`);
    console.log(`   Failed: ${summary.totalFailed}`);
    console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
  }

  // Clear all results
  clearResults(): void {
    this.allSuites = [];
    this.currentSuite = null;
  }
}

// Pre-defined test scenarios
export const RTLTestScenarios = {
  // Test button component
  testButton: (tester: RTLTester, buttonStyle: any, iconStyle: any) => {
    tester.startTestSuite('Button Component RTL');
    
    // Test flex direction
    tester.testFlexDirection(
      buttonStyle.flexDirection,
      'row-reverse',
      'row',
      'Button flex direction'
    );
    
    // Test icon positioning
    if (iconStyle) {
      tester.testSpacing(
        iconStyle,
        'marginRight',
        0,
        8,
        'Icon right margin'
      );
      
      tester.testSpacing(
        iconStyle,
        'marginLeft',
        8,
        0,
        'Icon left margin'
      );
    }
    
    return tester.endTestSuite();
  },

  // Test input component
  testInput: (tester: RTLTester, inputStyle: any, containerStyle: any) => {
    tester.startTestSuite('Input Component RTL');
    
    // Test text alignment
    tester.testTextAlignment(
      inputStyle.textAlign,
      'right',
      'left',
      'Input text alignment'
    );
    
    // Test container flex direction
    tester.testFlexDirection(
      containerStyle.flexDirection,
      'row-reverse',
      'row',
      'Input container flex direction'
    );
    
    return tester.endTestSuite();
  },

  // Test list component
  testList: (tester: RTLTester, itemStyle: any, contentStyle: any) => {
    tester.startTestSuite('List Component RTL');
    
    // Test item flex direction
    tester.testFlexDirection(
      itemStyle.flexDirection,
      'row-reverse',
      'row',
      'List item flex direction'
    );
    
    // Test content alignment
    tester.testTextAlignment(
      contentStyle.textAlign,
      'right',
      'left',
      'List content text alignment'
    );
    
    return tester.endTestSuite();
  },

  // Test card component
  testCard: (tester: RTLTester, cardStyle: any, textStyle: any) => {
    tester.startTestSuite('Card Component RTL');
    
    // Test card flex direction
    tester.testFlexDirection(
      cardStyle.flexDirection,
      'row-reverse',
      'row',
      'Card flex direction'
    );
    
    // Test text alignment
    tester.testTextAlignment(
      textStyle.textAlign,
      'right',
      'left',
      'Card text alignment'
    );
    
    return tester.endTestSuite();
  },

  // Test navigation component
  testNavigation: (tester: RTLTester, navStyle: any, backButtonStyle: any) => {
    tester.startTestSuite('Navigation Component RTL');
    
    // Test back button position
    tester.testPosition(
      backButtonStyle,
      'left',
      0,
      16,
      'Back button position'
    );
    
    // Test navigation flex direction
    tester.testFlexDirection(
      navStyle.flexDirection,
      'row-reverse',
      'row',
      'Navigation flex direction'
    );
    
    return tester.endTestSuite();
  }
};

// RTL validation helpers
export const RTLValidation = {
  // Validate text alignment
  validateTextAlignment: (textAlign: string): boolean => {
    if (textAlign === 'center' || textAlign === 'justify') return true;
    if (isRTL()) {
      return textAlign === 'right' || textAlign === 'left';
    }
    return textAlign === 'left' || textAlign === 'right';
  },

  // Validate flex direction
  validateFlexDirection: (flexDirection: string, expectedDirection: string): boolean => {
    if (flexDirection === 'column' || flexDirection === 'column-reverse') return true;
    if (isRTL()) {
      return flexDirection === (expectedDirection === 'row' ? 'row-reverse' : 'row');
    }
    return flexDirection === expectedDirection;
  },

  // Validate spacing
  validateSpacing: (style: any, property: string, expectedValue: number): boolean => {
    const rtlProperty = property.replace('Left', 'Right').replace('Right', 'Left');
    const actualProperty = isRTL() ? rtlProperty : property;
    return style[actualProperty] === expectedValue;
  },

  // Validate icon rotation
  validateIconRotation: (iconName: string, transform: any[]): boolean => {
    const shouldRotate = [
      'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right',
      'caret-left', 'caret-right', 'angle-left', 'angle-right',
      'back', 'forward', 'next', 'previous'
    ].some(name => iconName.includes(name));

    const hasScaleTransform = transform.some(t => t.scaleX === -1);
    return hasScaleTransform === (isRTL() && shouldRotate);
  }
};

// RTL debugging utilities
export const RTLDebug = {
  // Debug component styles
  debugComponentStyles: (componentName: string, styles: any) => {
    console.log(`\n🔍 RTL Debug: ${componentName}`);
    console.log('Current RTL state:', isRTL());
    console.log('I18nManager.isRTL:', I18nManager.isRTL);
    console.log('Component styles:', styles);
    
    // Check for common RTL issues
    const issues = [];
    
    if (styles.textAlign === 'left' && isRTL()) {
      issues.push('Text alignment may not be RTL-aware');
    }
    
    if (styles.flexDirection === 'row' && isRTL()) {
      issues.push('Flex direction may not be RTL-aware');
    }
    
    if (styles.marginLeft || styles.marginRight) {
      issues.push('Using marginLeft/marginRight instead of RTL-aware margins');
    }
    
    if (styles.paddingLeft || styles.paddingRight) {
      issues.push('Using paddingLeft/paddingRight instead of RTL-aware padding');
    }
    
    if (issues.length > 0) {
      console.log('⚠️  Potential RTL issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ No obvious RTL issues found');
    }
  },

  // Debug layout hierarchy
  debugLayoutHierarchy: (componentTree: any[], depth: number = 0) => {
    componentTree.forEach(component => {
      const indent = '  '.repeat(depth);
      console.log(`${indent}${component.name || 'Component'}`);
      
      if (component.props?.style) {
        const style = component.props.style;
        if (style.flexDirection) {
          console.log(`${indent}  flexDirection: ${style.flexDirection}`);
        }
        if (style.textAlign) {
          console.log(`${indent}  textAlign: ${style.textAlign}`);
        }
      }
      
      if (component.children) {
        RTLDebug.debugLayoutHierarchy(component.children, depth + 1);
      }
    });
  }
};

// Export main tester class
export default RTLTester;
export { RTLTester };