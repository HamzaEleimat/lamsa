import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  TextInput,
  Button,
  useTheme,
  IconButton,
  RadioButton,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../contexts/AuthContext';
import i18n from '../../i18n';

type StackParamList = {
  EditProfile: undefined;
  Settings: undefined;
};

type EditProfileScreenNavigationProp = NativeStackNavigationProp<
  StackParamList,
  'EditProfile'
>;

interface Props {
  navigation: EditProfileScreenNavigationProp;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  birthDate: string;
  address: string;
  photo?: string;
}

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { user, updateUser } = useContext(AuthContext);
  const isRTL = i18n.locale === 'ar';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    gender: 'other',
    birthDate: '',
    address: '',
    photo: undefined,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    birthDate: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      // Load from AsyncStorage or user context
      const savedProfile = await AsyncStorage.getItem('user_profile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      } else if (user) {
        setProfile({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          gender: user.gender || 'other',
          birthDate: user.birthDate || '',
          address: user.address || '',
          photo: user.photo,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        i18n.t('common.permissionRequired'),
        i18n.t('profile.photoPermissionMessage')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfile({ ...profile, photo: result.assets[0].uri });
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        i18n.t('common.permissionRequired'),
        i18n.t('profile.cameraPermissionMessage')
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfile({ ...profile, photo: result.assets[0].uri });
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      i18n.t('profile.changePhoto'),
      i18n.t('profile.chooseOption'),
      [
        { text: i18n.t('profile.takePhoto'), onPress: handleTakePhoto },
        { text: i18n.t('profile.chooseFromLibrary'), onPress: handlePickImage },
        { text: i18n.t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      email: '',
      birthDate: '',
    };

    if (!profile.name.trim()) {
      newErrors.name = i18n.t('profile.validation.nameRequired');
    } else if (profile.name.trim().length < 2) {
      newErrors.name = i18n.t('profile.validation.nameTooShort');
    }

    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = i18n.t('profile.validation.invalidEmail');
    }

    if (profile.birthDate) {
      const birthYear = parseInt(profile.birthDate.split('-')[0]);
      const currentYear = new Date().getFullYear();
      if (birthYear > currentYear - 13 || birthYear < currentYear - 100) {
        newErrors.birthDate = i18n.t('profile.validation.invalidBirthDate');
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      
      // Update user context
      await updateUser({
        ...user,
        ...profile,
      });

      // In a real app, make API call to update profile
      // await api.updateProfile(profile);

      setSnackbarMessage(i18n.t('profile.saveSuccess'));
      setSnackbarVisible(true);
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSnackbarMessage(i18n.t('profile.saveError'));
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      i18n.t('profile.deleteAccount'),
      i18n.t('profile.deleteAccountConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            // Handle account deletion
            console.log('Delete account');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon={isRTL ? "arrow-right" : "arrow-left"}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>
          {i18n.t('profile.editProfile')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {profile.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headlineLarge" style={{ color: theme.colors.onPrimary }}>
                  {profile.name.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <IconButton
              icon="camera"
              mode="contained"
              size={20}
              onPress={showImageOptions}
              style={[styles.cameraButton, { backgroundColor: theme.colors.secondary }]}
            />
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <TextInput
            label={i18n.t('profile.fullName')}
            value={profile.name}
            onChangeText={(text) => setProfile({ ...profile, name: text })}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.name ? (
            <Text variant="bodySmall" style={styles.errorText}>
              {errors.name}
            </Text>
          ) : null}

          <TextInput
            label={i18n.t('profile.email')}
            value={profile.email}
            onChangeText={(text) => setProfile({ ...profile, email: text })}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!errors.email}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.email ? (
            <Text variant="bodySmall" style={styles.errorText}>
              {errors.email}
            </Text>
          ) : null}

          <TextInput
            label={i18n.t('profile.phone')}
            value={profile.phone}
            mode="outlined"
            style={styles.input}
            disabled
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Gender Selection */}
          <View style={styles.genderSection}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              {i18n.t('profile.gender')}
            </Text>
            <RadioButton.Group
              onValueChange={(value) => setProfile({ ...profile, gender: value as any })}
              value={profile.gender}
            >
              <View style={styles.radioRow}>
                <View style={styles.radioItem}>
                  <RadioButton value="male" />
                  <Text>{i18n.t('profile.male')}</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="female" />
                  <Text>{i18n.t('profile.female')}</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="other" />
                  <Text>{i18n.t('profile.other')}</Text>
                </View>
              </View>
            </RadioButton.Group>
          </View>

          <TextInput
            label={i18n.t('profile.birthDate')}
            value={profile.birthDate}
            onChangeText={(text) => setProfile({ ...profile, birthDate: text })}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
            error={!!errors.birthDate}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.birthDate ? (
            <Text variant="bodySmall" style={styles.errorText}>
              {errors.birthDate}
            </Text>
          ) : null}

          <TextInput
            label={i18n.t('profile.address')}
            value={profile.address}
            onChangeText={(text) => setProfile({ ...profile, address: text })}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        {/* Save Button */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
            contentStyle={styles.saveButtonContent}
          >
            {i18n.t('profile.saveChanges')}
          </Button>
        </View>

        {/* Delete Account */}
        <View style={styles.dangerSection}>
          <Button
            mode="text"
            onPress={handleDeleteAccount}
            textColor={theme.colors.error}
            style={styles.deleteButton}
          >
            {i18n.t('profile.deleteAccount')}
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  formSection: {
    paddingHorizontal: 16,
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: '#B00020',
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 12,
  },
  genderSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 8,
    opacity: 0.8,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  saveButton: {
    borderRadius: 28,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  dangerSection: {
    paddingHorizontal: 16,
    paddingTop: 40,
    alignItems: 'center',
  },
  deleteButton: {
    borderRadius: 28,
  },
});

export default EditProfileScreen;