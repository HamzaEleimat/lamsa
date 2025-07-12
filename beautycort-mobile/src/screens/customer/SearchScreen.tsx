import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import i18n from '../../i18n';

const SearchScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
        {i18n.t('screens.search.title')}
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

export default SearchScreen;
