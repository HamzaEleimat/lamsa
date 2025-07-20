import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';

interface QuickBookingFABProps {
  onPress: () => void;
  visible?: boolean;
  extended?: boolean;
  bottom?: number;
}

export default function QuickBookingFAB({
  onPress,
  visible = true,
  extended = false,
  bottom = 80,
}: QuickBookingFABProps) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const widthAnim = useRef(new Animated.Value(extended ? 200 : 56)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: visible ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(widthAnim, {
        toValue: extended ? 200 : 56,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [visible, extended]);

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    width: widthAnim,
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        { bottom },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#25D366', '#128C7E']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="flash" size={24} color={colors.white} />
          {extended && (
            <Text style={styles.text}>{t('quickBook')}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    height: 56,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  touchable: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 28,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});