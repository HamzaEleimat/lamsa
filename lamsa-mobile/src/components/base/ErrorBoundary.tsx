import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../../i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // TODO: Log to crash reporting service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback onRetry={this.handleRetry} error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  onRetry: () => void;
  error?: Error;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ onRetry, error }) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
      color: theme.colors.onBackground,
    },
    message: {
      fontSize: 16,
      marginBottom: 24,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      paddingHorizontal: 20,
    },
    errorDetails: {
      fontSize: 12,
      color: theme.colors.error,
      marginBottom: 16,
      textAlign: 'center',
      fontFamily: 'monospace',
    },
  });

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={64}
        color={theme.colors.error}
        style={styles.icon}
      />
      <Text style={styles.title}>{i18n.t('errors.somethingWentWrong')}</Text>
      <Text style={styles.message}>{i18n.t('errors.tryAgainMessage')}</Text>
      
      {__DEV__ && error && (
        <Text style={styles.errorDetails}>
          {error.name}: {error.message}
        </Text>
      )}

      <Button mode="contained" onPress={onRetry}>
        {i18n.t('common.tryAgain')}
      </Button>
    </View>
  );
};

export default ErrorBoundary;
