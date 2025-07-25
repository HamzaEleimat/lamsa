import React, { useEffect, useState } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  Button,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { 
  isIOS, 
  isAndroid,
  platformSelect,
  screenWidth,
  screenHeight,
  getStatusBarHeight,
  isTablet,
  supportsFaceID,
  supportsFingerprint,
  supportsHapticFeedback,
  isRTL,
  hasNotch,
  getSafeAreaInsets,
  SHADOW_STYLES,
  FONTS,
  BORDER_RADIUS,
  SPACING,
  getDeviceInfo,
  getNetworkInfo,
  getBatteryInfo,
  checkPermission,
  requestPermission,
  hasAllPermissions,
  getDeviceCapabilities,
  isLowEndDevice,
} from '@utils/platform';

export default function PlatformDemo() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [batteryInfo, setBatteryInfo] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => {
    loadDeviceInfo();
    checkAllPermissions();
  }, []);

  const loadDeviceInfo = async () => {
    const [device, network, battery] = await Promise.all([
      getDeviceInfo(),
      getNetworkInfo(),
      getBatteryInfo(),
    ]);
    
    setDeviceInfo(device);
    setNetworkInfo(network);
    setBatteryInfo(battery);
  };

  const checkAllPermissions = async () => {
    const types = ['location', 'camera', 'photos', 'notifications', 'contacts', 'calendar'] as const;
    const results: any = {};
    
    for (const type of types) {
      results[type] = await checkPermission(type);
    }
    
    setPermissions(results);
  };

  const requestTestPermission = async () => {
    const result = await requestPermission('camera', {
      title: 'Camera Test',
      message: 'Testing camera permission request',
      showRationale: true,
    });
    
    Alert.alert('Permission Result', `Status: ${result.status}`);
    checkAllPermissions();
  };

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={[styles.section, SHADOW_STYLES.small]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {content}
    </View>
  );

  const renderItem = (label: string, value: any) => (
    <View style={styles.item}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {renderSection('Platform Detection', (
          <>
            {renderItem('Platform', isIOS ? 'iOS' : isAndroid ? 'Android' : 'Web')}
            {renderItem('Version', isIOS ? `iOS ${platformSelect({ ios: 'Version' })}` : `Android ${platformSelect({ android: 'Version' })}`)}
            {renderItem('Is Tablet', isTablet)}
            {renderItem('Is RTL', isRTL)}
            {renderItem('Has Notch', hasNotch())}
            {renderItem('Is Low-End Device', isLowEndDevice())}
          </>
        ))}

        {renderSection('Screen & Layout', (
          <>
            {renderItem('Screen Width', `${screenWidth}px`)}
            {renderItem('Screen Height', `${screenHeight}px`)}
            {renderItem('Status Bar Height', `${getStatusBarHeight()}px`)}
            {renderItem('Safe Area Top', `${getSafeAreaInsets().top}px`)}
            {renderItem('Safe Area Bottom', `${getSafeAreaInsets().bottom}px`)}
          </>
        ))}

        {renderSection('Device Capabilities', (
          <>
            {renderItem('Supports Face ID', supportsFaceID)}
            {renderItem('Supports Fingerprint', supportsFingerprint)}
            {renderItem('Supports Haptic', supportsHapticFeedback)}
            {Object.entries(getDeviceCapabilities()).map(([key, value]) => 
              renderItem(key, value)
            )}
          </>
        ))}

        {deviceInfo && renderSection('Device Information', (
          <>
            {renderItem('Brand', deviceInfo.brand || 'N/A')}
            {renderItem('Model', deviceInfo.modelName || 'N/A')}
            {renderItem('OS Version', deviceInfo.osVersion || 'N/A')}
            {renderItem('Is Emulator', deviceInfo.isEmulator)}
            {renderItem('App Version', deviceInfo.appVersion || 'N/A')}
            {renderItem('Build Number', deviceInfo.buildNumber || 'N/A')}
          </>
        ))}

        {networkInfo && renderSection('Network Information', (
          <>
            {renderItem('Connected', networkInfo.isConnected)}
            {renderItem('Type', networkInfo.type || 'N/A')}
            {renderItem('Is WiFi', networkInfo.isWifi)}
            {renderItem('Is Cellular', networkInfo.isCellular)}
          </>
        ))}

        {batteryInfo && renderSection('Battery Information', (
          <>
            {renderItem('Battery Level', batteryInfo.level ? `${Math.round(batteryInfo.level * 100)}%` : 'N/A')}
            {renderItem('Is Charging', batteryInfo.isCharging)}
            {renderItem('Low Power Mode', batteryInfo.lowPowerMode)}
          </>
        ))}

        {renderSection('Permissions', (
          <>
            {Object.entries(permissions).map(([type, result]: [string, any]) => 
              renderItem(type, result?.status || 'unknown')
            )}
            <TouchableOpacity 
              style={[styles.button, { borderRadius: BORDER_RADIUS.medium }]}
              onPress={requestTestPermission}
            >
              <Text style={styles.buttonText}>Request Camera Permission</Text>
            </TouchableOpacity>
          </>
        ))}

        {renderSection('Platform Styles Demo', (
          <View style={styles.styleDemo}>
            <View style={[styles.card, SHADOW_STYLES.small]}>
              <Text>Small Shadow</Text>
            </View>
            <View style={[styles.card, SHADOW_STYLES.medium]}>
              <Text>Medium Shadow</Text>
            </View>
            <View style={[styles.card, SHADOW_STYLES.large]}>
              <Text>Large Shadow</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    fontFamily: FONTS.bold,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  label: {
    fontWeight: '500',
    fontFamily: FONTS.regular,
  },
  value: {
    color: '#666',
    fontFamily: FONTS.regular,
  },
  button: {
    backgroundColor: '#FF8FAB',
    padding: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  styleDemo: {
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.small,
    alignItems: 'center',
  },
});