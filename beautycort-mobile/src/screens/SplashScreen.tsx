import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../i18n';

const SplashScreen: React.FC = () => {
  const theme = useTheme();
  const { isLoading } = useAuth();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    logo: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 20,
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.onBackground,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BeautyCort</Text>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
    </View>
  );
};

export default SplashScreen;
