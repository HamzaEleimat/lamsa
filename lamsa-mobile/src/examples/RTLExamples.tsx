/**
 * RTL Examples and Usage Guide
 * Demonstrates how to use RTL utilities in real components
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import RTLButton from '../components/RTLButton';
import RTLCard from '../components/RTLCard';
import RTLInput from '../components/RTLInput';
import RTLList from '../components/RTLList';
import { RTLContainer, RTLHeader, RTLRow, RTLSpacer } from '../components/RTLLayout';
import RTLTester, { RTLTestScenarios } from '../utils/rtl-testing';
import { isRTL } from '../i18n';

const RTLExamples: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Sample data for list
  const sampleData = [
    {
      id: '1',
      title: 'صالون الجمال الأول',
      subtitle: 'Beauty Salon',
      description: 'خدمات تجميل متكاملة للسيدات',
      image: <View style={styles.sampleImage} />,
      badge: <View style={styles.badge} />,
      onPress: () => Alert.alert('Item pressed', 'First item')
    },
    {
      id: '2',
      title: 'مركز العناية بالبشرة',
      subtitle: 'Skin Care Center',
      description: 'علاجات متخصصة للبشرة والوجه',
      image: <View style={styles.sampleImage} />,
      onPress: () => Alert.alert('Item pressed', 'Second item')
    },
    {
      id: '3',
      title: 'استوديو الأظافر',
      subtitle: 'Nail Studio',
      description: 'خدمات مانيكير وبيديكير احترافية',
      image: <View style={styles.sampleImage} />,
      disabled: true
    }
  ];

  // Run RTL tests
  const runRTLTests = () => {
    const tester = new RTLTester();
    
    // Test button styles
    const buttonStyle = { flexDirection: isRTL() ? 'row-reverse' : 'row' };
    const iconStyle = isRTL() ? { marginLeft: 8 } : { marginRight: 8 };
    RTLTestScenarios.testButton(tester, buttonStyle, iconStyle);
    
    // Test input styles
    const inputStyle = { textAlign: isRTL() ? 'right' : 'left' };
    const containerStyle = { flexDirection: isRTL() ? 'row-reverse' : 'row' };
    RTLTestScenarios.testInput(tester, inputStyle, containerStyle);
    
    // Print results
    tester.printResults();
    
    const summary = tester.getSummary();
    Alert.alert(
      'RTL Test Results',
      `Passed: ${summary.totalPassed}/${summary.totalTests} (${summary.successRate.toFixed(1)}%)`
    );
  };

  return (
    <RTLContainer safe scrollable>
      <RTLHeader
        title="RTL Examples"
        subtitle="Demonstration of RTL-aware components"
        rightComponent={
          <RTLButton
            title="Test"
            onPress={runRTLTests}
            variant="text"
            size="small"
          />
        }
      />

      <View style={styles.section}>
        <RTLButton
          title="Primary Button"
          onPress={() => Alert.alert('Primary button pressed')}
          variant="primary"
          fullWidth
        />
        
        <RTLSpacer size={8} />
        
        <RTLButton
          title="Secondary Button"
          onPress={() => Alert.alert('Secondary button pressed')}
          variant="secondary"
          fullWidth
        />
        
        <RTLSpacer size={8} />
        
        <RTLRow justify="space-between">
          <RTLButton
            title="With Icon"
            onPress={() => Alert.alert('Icon button pressed')}
            variant="primary"
            icon={<View style={styles.buttonIcon} />}
            iconPosition="left"
          />
          
          <RTLButton
            title="Loading"
            onPress={() => {}}
            variant="secondary"
            loading={true}
          />
        </RTLRow>
      </View>

      <View style={styles.section}>
        <RTLInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search for services..."
          label="Search"
          leftIcon={<View style={styles.searchIcon} />}
          rightIcon={<View style={styles.clearIcon} />}
        />
        
        <RTLSpacer size={8} />
        
        <RTLInput
          value=""
          onChangeText={() => {}}
          placeholder="Password"
          label="Password"
          secureTextEntry
          required
        />
        
        <RTLSpacer size={8} />
        
        <RTLInput
          value=""
          onChangeText={() => {}}
          placeholder="Tell us about yourself..."
          label="Description"
          multiline
          numberOfLines={4}
          maxLength={200}
        />
      </View>

      <View style={styles.section}>
        <RTLCard
          title="صالون الجمال الراقي"
          subtitle="Premium Beauty Salon"
          description="نقدم خدمات التجميل والعناية الشخصية بأعلى جودة وأحدث التقنيات في بيئة مريحة وآمنة"
          image={<View style={styles.cardImage} />}
          imagePosition="left"
          actions={
            <RTLRow>
              <RTLButton
                title="Book"
                onPress={() => Alert.alert('Book pressed')}
                variant="primary"
                size="small"
              />
              <RTLSpacer size={8} horizontal />
              <RTLButton
                title="Info"
                onPress={() => Alert.alert('Info pressed')}
                variant="text"
                size="small"
              />
            </RTLRow>
          }
          onPress={() => Alert.alert('Card pressed')}
        />
        
        <RTLSpacer size={12} />
        
        <RTLCard
          title="مركز العناية المتخصص"
          subtitle="Specialized Care Center"
          description="علاجات متطورة للبشرة والشعر"
          image={<View style={styles.cardImage} />}
          imagePosition="right"
          elevation={1}
        />
      </View>

      <View style={styles.section}>
        <RTLList
          data={sampleData}
          showSeparator={true}
          onRefresh={() => {
            // Simulate refresh
            setTimeout(() => {
              Alert.alert('Refreshed', 'Data has been refreshed');
            }, 1000);
          }}
          refreshing={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <RTLButton
                title="Available Services"
                onPress={() => {}}
                variant="text"
                size="small"
              />
            </View>
          }
          ListFooterComponent={
            <View style={styles.listFooter}>
              <RTLButton
                title="Load More"
                onPress={() => Alert.alert('Load more pressed')}
                variant="secondary"
                fullWidth
              />
            </View>
          }
        />
      </View>

      <View style={styles.section}>
        <RTLRow justify="space-between" align="center">
          <RTLButton
            title="Left Action"
            onPress={() => Alert.alert('Left action')}
            variant="text"
          />
          
          <RTLButton
            title="Center Action"
            onPress={() => Alert.alert('Center action')}
            variant="primary"
          />
          
          <RTLButton
            title="Right Action"
            onPress={() => Alert.alert('Right action')}
            variant="text"
          />
        </RTLRow>
      </View>

      <View style={styles.debugSection}>
        <RTLButton
          title="Debug RTL Layout"
          onPress={() => {
            console.log('=== RTL Debug Info ===');
            console.log('Current RTL state:', isRTL());
            console.log('Sample styles with RTL:');
            console.log('Button flex direction:', isRTL() ? 'row-reverse' : 'row');
            console.log('Text alignment:', isRTL() ? 'right' : 'left');
            console.log('Margin start (8px):', isRTL() ? { marginRight: 8 } : { marginLeft: 8 });
          }}
          variant="secondary"
          fullWidth
        />
        
        <RTLSpacer size={8} />
        
        <RTLButton
          title="Test All Components"
          onPress={runRTLTests}
          variant="primary"
          fullWidth
        />
      </View>
    </RTLContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  debugSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F8F8F8'
  },
  sampleImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0'
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30'
  },
  buttonIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2
  },
  searchIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#666666',
    borderRadius: 2
  },
  clearIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#999999',
    borderRadius: 8
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0'
  },
  listHeader: {
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  listFooter: {
    paddingVertical: 16,
    paddingHorizontal: 16
  }
});

export default RTLExamples;