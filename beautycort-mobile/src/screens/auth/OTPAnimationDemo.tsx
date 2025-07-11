import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

/**
 * OTP Screen Animation Features Demo
 * 
 * The enhanced OTPVerifyScreen includes the following animations:
 * 
 * 1. **Entry Animations**
 *    - Staggered fade-in and scale animation for OTP inputs
 *    - Icon fade and scale on mount
 *    - Smooth transitions between screens
 * 
 * 2. **Interactive Animations**
 *    - Scale bounce when typing in each input
 *    - Pressable feedback on input boxes
 *    - Shake animation on error with haptic feedback
 * 
 * 3. **Success Animations**
 *    - Icon change from message to checkmark
 *    - Fade out all inputs on success
 *    - Success message with celebration emoji
 * 
 * 4. **Timer Animations**
 *    - Animated progress bar for resend countdown
 *    - Smooth countdown transitions
 * 
 * 5. **Error Handling**
 *    - Shake animation with vibration
 *    - Red border highlight on error
 *    - Auto-clear and refocus on error
 * 
 * 6. **Additional Features**
 *    - Auto-advance to next input
 *    - Backspace navigation
 *    - Paste support with animation
 *    - Auto-submit on completion
 *    - Phone number chip with edit option
 *    - Loading states with disabled inputs
 */

// Animation Timeline
const animationTimeline = {
  mount: {
    iconFade: '0-300ms',
    inputStagger: '50ms delay between each',
    totalDuration: '600ms',
  },
  typing: {
    scaleBounce: '150ms up, 150ms down',
    nextFocus: 'immediate',
  },
  error: {
    shake: '200ms total',
    vibration: '50ms',
    clearInputs: 'after shake',
  },
  success: {
    iconChange: 'immediate',
    fadeOut: '300ms',
    navigate: '1500ms delay',
  },
  resend: {
    countdown: '1000ms intervals',
    progressBar: 'continuous',
    resetAnimation: '300ms',
  },
};

// Key Animation Code Snippets
const animationExamples = `
// 1. Staggered Entry Animation
Animated.stagger(50, 
  fadeAnimations.map((anim, index) => 
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimations[index], {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ])
  )
).start();

// 2. Input Scale Bounce
Animated.spring(scaleAnimations[index], {
  toValue: 1.1,
  tension: 50,
  friction: 3,
  useNativeDriver: true,
}).start(() => {
  Animated.spring(scaleAnimations[index], {
    toValue: 1,
    tension: 50,
    friction: 3,
    useNativeDriver: true,
  }).start();
});

// 3. Error Shake Animation
Animated.sequence([
  Animated.timing(shakeAnimation, { toValue: 10, duration: 50 }),
  Animated.timing(shakeAnimation, { toValue: -10, duration: 50 }),
  Animated.timing(shakeAnimation, { toValue: 10, duration: 50 }),
  Animated.timing(shakeAnimation, { toValue: 0, duration: 50 }),
]).start();

// 4. Success Fade Out
Animated.parallel(
  fadeAnimations.map(anim =>
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    })
  )
).start();
`;

export const OTPAnimationDemo: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTP Screen Animations</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Animation Features:</Text>
        <Text style={styles.feature}>✨ Staggered input appearance</Text>
        <Text style={styles.feature}>📱 Haptic feedback on errors</Text>
        <Text style={styles.feature}>🎯 Auto-focus navigation</Text>
        <Text style={styles.feature}>✅ Success celebrations</Text>
        <Text style={styles.feature}>⏱️ Animated countdown timer</Text>
        <Text style={styles.feature}>🔄 Smooth transitions</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Experience:</Text>
        <Text style={styles.description}>
          The OTP screen provides a delightful user experience with smooth animations
          that guide the user through the verification process. Each interaction
          provides visual feedback, making the flow intuitive and engaging.
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance:</Text>
        <Text style={styles.description}>
          All animations use the native driver for optimal performance. The animations
          run at 60 FPS on most devices without affecting the UI responsiveness.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#E91E63',
  },
  feature: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});

export default OTPAnimationDemo;