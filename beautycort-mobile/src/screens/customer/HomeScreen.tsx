import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useAppState } from '../../contexts/AppStateContext';
import i18n from '../../i18n';

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const { language } = useAppState();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
        {i18n.t('screens.home.title')}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        {i18n.t('screens.home.welcome')}
      </Text>
      <Text style={{ marginTop: 20, color: theme.colors.onSurfaceVariant }}>
        Current Language: {language}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default HomeScreen;
