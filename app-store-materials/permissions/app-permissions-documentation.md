# Lamsa App Permissions Documentation

## Overview

This document explains all permissions requested by the Lamsa mobile application, why each permission is needed, and how user data is protected.

## iOS Permissions (Info.plist)

Based on the app.json configuration analysis, here are the iOS permissions and their justifications:

### 1. Camera Access (NSCameraUsageDescription)
**Permission:** `NSCameraUsageDescription`  
**Purpose:** "Lamsa needs access to your camera to take photos of your beauty services and profile."

**Why We Need This:**
- **Profile Photos:** Users can take profile pictures directly in the app
- **Service Documentation:** Beauty providers can photograph their work/portfolio
- **Before/After Photos:** Document service results for reviews
- **Portfolio Building:** Providers can showcase their services with photos

**User Control:**
- Permission requested only when camera features are accessed
- Users can deny and still use core app features
- Can be changed anytime in device settings

**Data Handling:**
- Photos are processed locally before upload
- Images are compressed and optimized for storage
- Users can delete photos anytime
- Photos are encrypted during transmission

---

### 2. Photo Library Access (NSPhotoLibraryUsageDescription)
**Permission:** `NSPhotoLibraryUsageDescription`  
**Purpose:** "Lamsa needs access to your photo library to select photos for your profile and services."

**Why We Need This:**
- **Profile Setup:** Select existing photos for user profiles
- **Service Galleries:** Providers can choose portfolio images from their library
- **Review Photos:** Customers can attach photos to service reviews
- **Avatar Selection:** Choose profile pictures from existing photos

**User Control:**
- Permission requested only when photo selection is needed
- Users can select "Limited Access" to choose specific photos only
- Full denial still allows app usage without photo features

**Data Handling:**
- Only selected photos are accessed, not entire library
- Photos are reviewed for appropriate content before display
- Original files remain on user's device

---

### 3. Location Services (NSLocationWhenInUseUsageDescription)
**Permission:** `NSLocationWhenInUseUsageDescription` & `NSLocationAlwaysAndWhenInUseUsageDescription`  
**Purpose:** "Lamsa needs access to your location to find nearby beauty service providers."

**Why We Need This:**
- **Provider Search:** Find beauty services near user's current location
- **Distance Calculation:** Show accurate distances to service providers
- **Service Area Matching:** Match users with providers in their service area
- **Location-Based Recommendations:** Suggest relevant providers based on location

**User Control:**
- Only "When in Use" location access is requested (not background)
- Users can search manually by entering location if permission denied
- Location sharing is optional for core app functionality

**Data Handling:**
- Location data is used only for search and matching
- Precise location is not stored permanently
- Only general area information is retained for service improvement

---

### 4. Push Notifications (NSUserNotificationsUsageDescription)
**Permission:** `NSUserNotificationsUsageDescription`  
**Purpose:** "Lamsa needs to send you notifications about your bookings and appointments."

**Why We Need This:**
- **Booking Confirmations:** Confirm when appointments are scheduled
- **Appointment Reminders:** Remind users of upcoming appointments
- **Schedule Changes:** Notify of any changes or cancellations
- **Provider Updates:** Important updates from service providers
- **Promotional Offers:** Optional marketing notifications (with separate consent)

**User Control:**
- Users can disable notifications entirely
- Granular control over notification types in app settings
- Essential booking notifications can be kept while disabling promotional ones

**Data Handling:**
- Notification tokens are securely stored
- Notification content is minimal and non-sensitive
- Users can opt out anytime

---

### 5. Contacts Access (NSContactsUsageDescription)
**Permission:** `NSContactsUsageDescription`  
**Purpose:** "Lamsa needs access to your contacts to help you share services with friends."

**Why We Need This:**
- **Referral System:** Easily invite friends to try the app
- **Gift Services:** Send beauty services as gifts to contacts
- **Emergency Contacts:** Share appointment details with family/friends
- **Provider Recommendations:** Recommend services to friends

**User Control:**
- This is an optional feature - core app works without contacts access
- Users can manually enter phone numbers if they prefer
- Permission can be revoked without affecting main functionality

**Data Handling:**
- Contact information is not stored on our servers
- Only used locally for contact selection interface
- No contact data is shared with third parties

---

### 6. Calendar Access (NSCalendarsUsageDescription)
**Permission:** `NSCalendarsUsageDescription`  
**Purpose:** "Lamsa needs access to your calendar to schedule your beauty appointments."

**Why We Need This:**
- **Appointment Scheduling:** Add confirmed bookings to user's calendar
- **Availability Checking:** Prevent double-booking by checking calendar
- **Automatic Reminders:** Sync with device calendar for reminders
- **Schedule Integration:** View availability when booking services

**User Control:**
- Optional feature - users can manage appointments manually if preferred
- Permission can be granted/revoked independently
- App provides internal calendar view if system calendar access denied

**Data Handling:**
- Only booking-related events are added to calendar
- Events are removed if appointments are cancelled
- No personal calendar data is accessed or stored

---

### 7. Microphone Access (NSMicrophoneUsageDescription)
**Permission:** `NSMicrophoneUsageDescription`  
**Purpose:** "Lamsa needs access to your microphone for voice messages and video calls with providers."

**Why We Need This:**
- **Voice Messages:** Send voice notes to providers for better communication
- **Video Consultations:** Enable video calls for service consultations
- **Audio Reviews:** Record audio reviews for services
- **Voice Search:** Search for services using voice commands

**User Control:**
- Feature is entirely optional
- Text-based communication available as alternative
- Permission requested only when audio features are accessed

**Data Handling:**
- Audio is transmitted securely and not stored permanently
- Voice messages are automatically deleted after 30 days
- Video calls are not recorded

---

## Android Permissions

### Core Permissions Required

#### 1. CAMERA
**Purpose:** Take photos for profiles and service documentation
**Justification:** Same as iOS camera permission
**User Impact:** Optional feature, core app works without it

#### 2. RECORD_AUDIO  
**Purpose:** Voice messages and video consultations
**Justification:** Same as iOS microphone permission
**User Impact:** Optional feature, text alternatives available

#### 3. READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE
**Purpose:** Access photos from device storage and save images
**Justification:** 
- Read: Select photos for profiles and portfolios
- Write: Save photos taken within the app or service documentation

#### 4. ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION
**Purpose:** Find nearby beauty service providers
**Justification:** Core feature for location-based service discovery
**User Impact:** Manual location entry available as fallback

#### 5. VIBRATE
**Purpose:** Provide haptic feedback for notifications and confirmations
**Justification:** Enhanced user experience for important actions
**User Impact:** Purely cosmetic, no functionality impact

#### 6. RECEIVE_BOOT_COMPLETED
**Purpose:** Restart notification services after device reboot
**Justification:** Ensure appointment reminders work after device restart
**User Impact:** Background system permission, no user action required

#### 7. READ_CONTACTS / WRITE_CONTACTS
**Purpose:** Referral system and emergency contact features
**Justification:** Same as iOS contacts permission
**User Impact:** Optional feature, manual entry available

#### 8. READ_CALENDAR / WRITE_CALENDAR
**Purpose:** Calendar integration for appointment scheduling
**Justification:** Same as iOS calendar permission
**User Impact:** Optional feature, internal calendar available

### Network Permissions

#### 9. ACCESS_NETWORK_STATE
**Purpose:** Check internet connectivity status
**Justification:** 
- Provide offline mode when network unavailable
- Optimize data usage based on connection type
- Show appropriate error messages for network issues

#### 10. ACCESS_WIFI_STATE
**Purpose:** Detect WiFi connection for data optimization
**Justification:**
- Use higher quality images when on WiFi
- Enable video features only on good connections
- Optimize download behavior

#### 11. INTERNET
**Purpose:** Core app functionality requiring internet access
**Justification:**
- Connect to Lamsa API services
- Load provider information and photos
- Process bookings and payments
- Send notifications and messages

#### 12. SYSTEM_ALERT_WINDOW
**Purpose:** Display important notifications over other apps
**Justification:**
- Show critical appointment reminders
- Display emergency booking changes
- Urgent provider communications

**User Control:** Users can disable overlay permissions in Android settings

---

## Permission Request Strategy

### 1. Just-in-Time Requests
- Permissions requested only when feature is accessed
- Clear explanation provided at point of request
- Users understand why permission is needed

### 2. Progressive Permission Requests
- Start with core permissions only
- Request additional permissions as user explores features
- Never request all permissions at app launch

### 3. Graceful Fallbacks
- App remains functional even if permissions denied
- Alternative methods provided where possible
- Clear messaging about limited functionality

### 4. Permission Education
- In-app tutorials explain why permissions improve experience
- Settings screen shows current permission status
- Easy access to device settings for permission changes

---

## Privacy Safeguards

### 1. Data Minimization
- Only collect data necessary for requested feature
- Regularly purge unnecessary data
- User controls over data retention

### 2. Secure Transmission
- All sensitive data encrypted in transit
- Secure API endpoints with authentication
- Certificate pinning for additional security

### 3. Local Processing
- Process photos and audio locally when possible
- Minimize server-side data storage
- Cache data locally to reduce network requests

### 4. User Control
- Granular permission controls in app settings
- Easy data deletion options
- Clear privacy policy explaining data use

---

## App Store Compliance

### iOS App Store Guidelines
- All permissions include clear usage descriptions
- Permissions align with advertised app functionality
- No unexpected or undisclosed data collection
- Respectful of user privacy choices

### Google Play Store Requirements
- Sensitive permissions justified with core functionality
- Target SDK compliance for permission handling
- Privacy policy covers all data collection
- Dangerous permissions properly requested at runtime

---

## User Communication Templates

### Permission Request Dialogs

#### Location Permission
**Title:** "Find Beauty Services Near You"
**Message:** "Lamsa uses your location to show nearby beauty providers and calculate accurate distances. Your location is only used when the app is active."
**Options:** "Allow While Using App" / "Don't Allow"

#### Camera Permission
**Title:** "Add Photos to Your Profile"
**Message:** "Take photos for your profile or service portfolio. Photos are stored securely and can be deleted anytime."
**Options:** "OK" / "Don't Allow"

#### Notification Permission
**Title:** "Stay Updated on Your Bookings"
**Message:** "Get reminders for your appointments and important updates from your beauty providers."
**Options:** "Allow" / "Don't Allow"

### Settings Screen Text

```
Permissions
Manage how Lamsa uses your device features:

📍 Location: Enabled
Find nearby beauty providers
> Manage in Settings

📷 Camera: Enabled  
Take photos for your profile
> Manage in Settings

🔔 Notifications: Enabled
Get booking reminders and updates
> Manage in Settings

📞 Contacts: Not Enabled
Easily invite friends to Lamsa
> Enable in Settings

📅 Calendar: Enabled
Add appointments to your calendar
> Manage in Settings
```

---

This documentation ensures transparency about data usage and helps users make informed decisions about permissions while maintaining app functionality.