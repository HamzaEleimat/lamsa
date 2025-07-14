# Provider Onboarding API Integration Guide

## Overview

This document details the API integration patterns, data flow, and backend communication for the BeautyCort mobile provider onboarding system.

## API Endpoints

### Base URL
```
Production: https://api.beautycort.com
Development: http://localhost:3000
```

### Authentication
All onboarding endpoints require JWT authentication token obtained during phone verification.

```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

## Endpoint Specifications

### 1. Initialize Onboarding

**Endpoint**: `POST /api/providers/onboarding/initialize`

**Purpose**: Start the provider onboarding process and get initial state

**Request Body**:
```json
{
  "phone": "+962791234567",
  "userType": "provider"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "provider": {
      "id": "uuid-v4",
      "phone": "+962791234567",
      "status": "onboarding",
      "createdAt": "2025-07-14T10:00:00Z"
    },
    "steps": [
      {
        "stepNumber": 1,
        "name": "business_information",
        "isCompleted": false,
        "data": {},
        "updatedAt": null
      },
      {
        "stepNumber": 2,
        "name": "location_setup",
        "isCompleted": false,
        "data": {},
        "updatedAt": null
      }
      // ... steps 3-7
    ],
    "serviceTemplates": [
      {
        "id": "template-1",
        "categoryId": "hair-care",
        "name_en": "Haircut",
        "name_ar": "قص شعر",
        "defaultPrice": 25.00,
        "defaultDuration": 45
      }
    ]
  }
}
```

### 2. Update Onboarding Step

**Endpoint**: `PUT /api/providers/onboarding/step`

**Purpose**: Save step data and update completion status

**Request Body**:
```json
{
  "stepNumber": 1,
  "data": {
    "ownerName": "Fatima Al-Zahra",
    "email": "fatima@example.com",
    "businessName": "Elegant Beauty Salon",
    "businessNameAr": "صالون الأناقة للجمال",
    "businessType": "salon",
    "description": "Professional beauty services",
    "descriptionAr": "خدمات جمال احترافية"
  },
  "isCompleted": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "step": {
      "stepNumber": 1,
      "name": "business_information",
      "isCompleted": true,
      "data": {
        "ownerName": "Fatima Al-Zahra",
        "businessName": "Elegant Beauty Salon",
        "businessNameAr": "صالون الأناقة للجمال",
        "businessType": "salon"
      },
      "updatedAt": "2025-07-14T10:05:00Z"
    },
    "nextStep": 2,
    "isLastStep": false,
    "profileCompletion": 14
  }
}
```

### 3. Upload Verification Document

**Endpoint**: `POST /api/providers/onboarding/upload-document`

**Purpose**: Upload professional license or portfolio images

**Request**: Multipart form data
```
FormData:
- document: File (image file)
- documentType: string ('license' | 'portfolio')
- documentNumber?: string (license number if applicable)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "doc-uuid-v4",
    "documentUrl": "https://storage.beautycort.com/documents/doc-uuid-v4.jpg",
    "documentType": "license",
    "uploadedAt": "2025-07-14T10:15:00Z",
    "verificationStatus": "pending"
  }
}
```

### 4. Get Service Templates

**Endpoint**: `GET /api/providers/service-templates`

**Purpose**: Retrieve available service templates for selected categories

**Query Parameters**:
```
?categories=hair-care,nail-care,skincare
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "template-1",
      "categoryId": "hair-care",
      "name_en": "Women's Haircut",
      "name_ar": "قص شعر نسائي",
      "description_en": "Professional haircut and styling",
      "description_ar": "قص شعر وتصفيف احترافي",
      "defaultPrice": 25.00,
      "defaultDuration": 45,
      "popularity": 95
    }
  ]
}
```

### 5. Complete Onboarding

**Endpoint**: `POST /api/providers/onboarding/complete`

**Purpose**: Finalize onboarding and activate provider account

**Request Body**:
```json
{
  "agreedToTerms": true,
  "marketingConsent": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "provider": {
      "id": "provider-uuid-v4",
      "phone": "+962791234567",
      "status": "active",
      "profileCompletion": 100,
      "verificationStatus": "pending",
      "businessInfo": {
        "ownerName": "Fatima Al-Zahra",
        "businessName": "Elegant Beauty Salon",
        "businessNameAr": "صالون الأناقة للجمال",
        "businessType": "salon"
      },
      "location": {
        "address": "Abdoun, Amman, Jordan",
        "latitude": 31.9515,
        "longitude": 35.9239,
        "serviceRadius": 5
      },
      "categories": ["hair-care", "nail-care"],
      "workingHours": {
        "0": { "isWorkingDay": true, "openingTime": "09:00", "closingTime": "18:00" }
      },
      "completedAt": "2025-07-14T10:30:00Z"
    }
  }
}
```

## Data Models

### Provider Entity

```typescript
interface Provider {
  id: string;
  phone: string;
  status: 'onboarding' | 'active' | 'suspended' | 'pending_verification';
  profileCompletion: number; // 0-100
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
  
  // Onboarding data
  businessInfo?: BusinessInformation;
  location?: LocationData;
  categories?: string[];
  workingHours?: WorkingHoursData;
  verification?: VerificationData;
  completedAt?: string;
}
```

### Onboarding Step

```typescript
interface OnboardingStep {
  stepNumber: number;
  name: string;
  isCompleted: boolean;
  data: Record<string, any>;
  updatedAt: string | null;
}
```

### Step-Specific Data Models

#### Step 1: Business Information
```typescript
interface BusinessInformation {
  ownerName: string;
  email?: string;
  businessName: string;
  businessNameAr: string;
  businessType: 'salon' | 'mobile' | 'freelancer';
  description?: string;
  descriptionAr?: string;
}
```

#### Step 2: Location Data
```typescript
interface LocationData {
  address: string;
  addressAr?: string;
  latitude: number;
  longitude: number;
  isMobile: boolean;
  serviceRadius?: number;
  serviceAreas?: string[];
  landmark?: string;
  landmarkAr?: string;
}
```

#### Step 3: Service Categories
```typescript
interface ServiceCategoriesData {
  selectedCategories: string[];
}
```

#### Step 4: Working Hours
```typescript
interface WorkingHoursData {
  businessHours: {
    [dayOfWeek: number]: {
      dayOfWeek: number;
      isWorkingDay: boolean;
      openingTime: string;
      closingTime: string;
      breakStartTime?: string;
      breakEndTime?: string;
    }
  }
}
```

#### Step 5: License Verification
```typescript
interface VerificationData {
  hasLicense: boolean;
  licenseType?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  issuingAuthority?: string;
  licenseDocument?: string;
  experienceYears?: number;
  portfolioImages?: string[];
  additionalNotes?: string;
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "ownerName",
        "message": "Owner name is required"
      }
    ]
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `UNAUTHORIZED` | Invalid or missing auth token | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `DUPLICATE_PHONE` | Phone number already registered | 409 |
| `UPLOAD_FAILED` | Document upload failed | 422 |
| `RATE_LIMITED` | Too many requests | 429 |
| `SERVER_ERROR` | Internal server error | 500 |

### Error Handling in Mobile App

```typescript
const handleApiError = (error: any) => {
  if (error.response?.data?.error) {
    const { code, message, details } = error.response.data.error;
    
    switch (code) {
      case 'VALIDATION_ERROR':
        // Show field-specific errors
        details?.forEach((detail: any) => {
          setError(detail.field, { message: detail.message });
        });
        break;
        
      case 'UNAUTHORIZED':
        // Redirect to login
        navigation.navigate('Auth');
        break;
        
      case 'RATE_LIMITED':
        // Show rate limit message
        Alert.alert('Too Many Requests', 'Please wait before trying again');
        break;
        
      default:
        // Generic error message
        Alert.alert('Error', message);
    }
  }
};
```

## Service Implementation

### ProviderOnboardingService Integration

```typescript
// API client configuration
const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      await tokenManager.forceRefresh();
      // Retry original request
      return apiClient.request(error.config);
    }
    throw error;
  }
);
```

### Offline Support Strategy

```typescript
interface OfflineAction {
  id: string;
  type: 'update_step' | 'upload_document';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineManager {
  private static readonly OFFLINE_QUEUE_KEY = 'offline_onboarding_queue';
  
  static async queueAction(action: OfflineAction): Promise<void> {
    const queue = await this.getOfflineQueue();
    queue.push(action);
    await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }
  
  static async processOfflineQueue(): Promise<void> {
    const queue = await this.getOfflineQueue();
    
    for (const action of queue) {
      try {
        await this.processAction(action);
        // Remove successful action from queue
        await this.removeFromQueue(action.id);
      } catch (error) {
        // Increment retry count
        action.retryCount++;
        if (action.retryCount > 3) {
          // Remove failed action after 3 retries
          await this.removeFromQueue(action.id);
        }
      }
    }
  }
}
```

## Testing API Integration

### Unit Tests

```typescript
describe('ProviderOnboardingService API Integration', () => {
  beforeEach(() => {
    // Mock API responses
    mockApiClient.reset();
  });
  
  it('should initialize onboarding successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        provider: { id: 'test-id', status: 'onboarding' },
        steps: []
      }
    };
    
    mockApiClient.post('/providers/onboarding/initialize').reply(200, mockResponse);
    
    const result = await ProviderOnboardingService.initializeOnboarding('+962791234567');
    
    expect(result.provider.id).toBe('test-id');
    expect(result.provider.status).toBe('onboarding');
  });
  
  it('should handle validation errors', async () => {
    const mockError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'ownerName', message: 'Owner name is required' }]
      }
    };
    
    mockApiClient.put('/providers/onboarding/step').reply(400, mockError);
    
    await expect(
      ProviderOnboardingService.updatePersonalInformation({})
    ).rejects.toThrow('Validation error');
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Onboarding Flow', () => {
  it('should complete full onboarding process', async () => {
    // Step 1: Initialize
    const initResult = await ProviderOnboardingService.initializeOnboarding('+962791234567');
    expect(initResult.provider.status).toBe('onboarding');
    
    // Step 2: Business Information
    await ProviderOnboardingService.updatePersonalInformation({
      ownerName: 'Test Owner',
      businessName: 'Test Business',
      businessNameAr: 'اختبار العمل',
      businessType: 'salon'
    });
    
    // Step 3: Location
    await ProviderOnboardingService.updateLocationSetup({
      address: 'Test Address',
      latitude: 31.9515,
      longitude: 35.9239
    });
    
    // Continue through all steps...
    
    // Final: Complete onboarding
    const completion = await ProviderOnboardingService.completeOnboarding();
    expect(completion.status).toBe('active');
  });
});
```

## Performance Optimization

### Request Batching

```typescript
class BatchRequestManager {
  private batchQueue: Array<{ endpoint: string; data: any; timestamp: number }> = [];
  private batchTimeout?: NodeJS.Timeout;
  
  queueRequest(endpoint: string, data: any): void {
    this.batchQueue.push({ endpoint, data, timestamp: Date.now() });
    
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // Set new timeout to process batch
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 1000); // 1 second delay
  }
  
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    try {
      await apiClient.post('/providers/onboarding/batch', {
        requests: this.batchQueue
      });
      
      this.batchQueue = [];
    } catch (error) {
      console.error('Batch request failed:', error);
    }
  }
}
```

### Caching Strategy

```typescript
class OnboardingCache {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();
  
  static async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    return null;
  }
  
  static set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  static clear(): void {
    this.cache.clear();
  }
}
```

## Security Considerations

### Input Sanitization

```typescript
const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return data.trim().slice(0, 1000); // Limit string length
  }
  
  if (Array.isArray(data)) {
    return data.slice(0, 50).map(sanitizeInput); // Limit array size
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    Object.keys(data).slice(0, 20).forEach(key => { // Limit object keys
      sanitized[key] = sanitizeInput(data[key]);
    });
    return sanitized;
  }
  
  return data;
};
```

### Request Signing

```typescript
const signRequest = (data: any, secret: string): string => {
  const payload = JSON.stringify(data);
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
};

// Add to request headers
headers['X-Signature'] = signRequest(requestData, API_SECRET);
```

## Monitoring and Analytics

### API Call Tracking

```typescript
const trackApiCall = (endpoint: string, duration: number, success: boolean) => {
  analytics.track('api_call', {
    endpoint,
    duration,
    success,
    timestamp: Date.now(),
    user_id: getCurrentUserId(),
    session_id: getSessionId()
  });
};

// Usage in interceptors
apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    trackApiCall(response.config.url, duration, true);
    return response;
  },
  (error) => {
    const duration = Date.now() - error.config.metadata.startTime;
    trackApiCall(error.config.url, duration, false);
    throw error;
  }
);
```

### Error Reporting

```typescript
const reportError = (error: any, context: string) => {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    userId: getCurrentUserId(),
    deviceInfo: getDeviceInfo(),
    appVersion: getAppVersion()
  };
  
  // Send to error tracking service
  crashlytics.recordError(errorReport);
};
```

---

**Last Updated**: July 2025  
**Version**: 1.0.0  
**Maintainer**: BeautyCort Backend Team