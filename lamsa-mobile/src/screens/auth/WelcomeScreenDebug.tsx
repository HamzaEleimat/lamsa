import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreenDebug = ({ navigation }: any) => {
  const handlePress = (action: string) => {
    Alert.alert('Button Pressed', `You pressed: ${action}`);
    console.log(`Button pressed: ${action}`);
    
    if (action === 'Get Started' || action === 'Provider') {
      navigation.navigate('PhoneAuth');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lamsa Debug</Text>
        <Text style={styles.subtitle}>Touch Test Screen</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => handlePress('Get Started')}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => handlePress('Provider')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Are you a provider?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={() => handlePress('Test')}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Test Alert Only</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF8FAB',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    color: '#666',
  },
  button: {
    backgroundColor: '#FF8FAB',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF8FAB',
  },
  secondaryButtonText: {
    color: '#FF8FAB',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#50373E',
    marginTop: 30,
  },
});

export default WelcomeScreenDebug;