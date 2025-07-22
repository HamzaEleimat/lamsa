import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n, { isRTL } from '../../i18n';

type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: undefined;
  OTPVerification: { phoneNumber: string };
  UserTypeSelection: { phoneNumber: string };
  CustomerOnboarding: { userData: { phone: string; userType: 'customer' } };
  ProviderOnboarding: { userData: { phone: string; userType: 'provider' } };
};

type UserTypeSelectionScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'UserTypeSelection'
>;

type UserTypeSelectionScreenRouteProp = RouteProp<
  AuthStackParamList,
  'UserTypeSelection'
>;

interface Props {
  navigation: UserTypeSelectionScreenNavigationProp;
  route: UserTypeSelectionScreenRouteProp;
}

type UserType = 'customer' | 'provider';

interface UserTypeOption {
  type: UserType;
  title: string;
  description: string;
  icon: string;
  features: string[];
  color: string;
}

const UserTypeSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { phoneNumber } = route.params;
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  const userTypeOptions: UserTypeOption[] = [
    {
      type: 'customer',
      title: i18n.t('userType.customer.title'),
      description: i18n.t('userType.customer.description'),
      icon: 'account',
      features: i18n.t('userType.customer.features', { returnObjects: true }) as string[],
      color: theme.colors.primary,
    },
    {
      type: 'provider',
      title: i18n.t('userType.provider.title'),
      description: i18n.t('userType.provider.description'),
      icon: 'briefcase',
      features: i18n.t('userType.provider.features', { returnObjects: true }) as string[],
      color: theme.colors.secondary,
    },
  ];

  const handleTypeSelection = (type: UserType) => {
    setSelectedType(type);
    
    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = () => {
    if (!selectedType) return;

    if (selectedType === 'customer') {
      navigation.navigate('CustomerOnboarding', { 
        userData: { phone: phoneNumber, userType: 'customer' } 
      });
    } else {
      navigation.navigate('ProviderOnboarding', { 
        userData: { phone: phoneNumber, userType: 'provider' } 
      });
    }
  };

  const renderUserTypeCard = (option: UserTypeOption) => {
    const isSelected = selectedType === option.type;
    
    return (
      <Animated.View
        key={option.type}
        style={[
          styles.cardContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleTypeSelection(option.type)}
          activeOpacity={0.7}
        >
          <Surface
            style={[
              styles.card,
              isSelected && {
                borderColor: option.color,
                borderWidth: 2,
                backgroundColor: `${option.color}08`,
              },
            ]}
            elevation={isSelected ? 4 : 2}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${option.color}15` },
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={32}
                  color={option.color}
                />
              </View>
              
              <View style={styles.headerText}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  {option.title}
                </Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>
                  {option.description}
                </Text>
              </View>
              
              {isSelected && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={option.color}
                />
              )}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.featuresContainer}>
              {option.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={option.color}
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Surface>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            icon={isRTL() ? 'chevron-right' : 'chevron-left'}
            style={styles.backButton}
          >
            {''} 
          </Button>
        </View>

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text variant="headlineMedium" style={styles.title}>
              {i18n.t('userType.title')}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {i18n.t('userType.subtitle')}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {userTypeOptions.map(renderUserTypeCard)}
          </View>

          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={!selectedType}
            style={[
              styles.continueButton,
              !selectedType && styles.disabledButton,
            ]}
            contentStyle={styles.continueButtonContent}
            labelStyle={styles.continueButtonText}
          >
            {i18n.t('userType.continue')}
          </Button>

          <View style={styles.helpContainer}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
              {i18n.t('userType.help')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    marginLeft: -8,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    opacity: 0.8,
  },
  continueButton: {
    borderRadius: 28,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueButtonContent: {
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  helpText: {
    marginLeft: 8,
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
  },
});

export default UserTypeSelectionScreen;
