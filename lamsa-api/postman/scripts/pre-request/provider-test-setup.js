/**
 * Postman Pre-request Script for Provider Login Tests
 * This script sets up test provider credentials and handles authentication
 * 
 * Usage: Add this to your Postman collection's pre-request scripts
 */

// Test Provider Configuration
const TEST_PROVIDERS = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    email: 'test.provider1@lamsa.test',
    password: 'TestProvider123!',
    phone: '+962781234567',
    businessName: 'Test Beauty Salon',
    services: [
      { id: 'd1111111-1111-1111-1111-111111111111', name: 'Test Hair Cut', price: 20 },
      { id: 'd2222222-2222-2222-2222-222222222222', name: 'Test Hair Coloring', price: 50 }
    ]
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    email: 'test.provider2@lamsa.test',
    password: 'TestProvider123!',
    phone: '+962787654321',
    businessName: 'Test Mobile Stylist',
    services: [
      { id: 'd3333333-3333-3333-3333-333333333333', name: 'Mobile Hair Styling', price: 35 },
      { id: 'd4444444-4444-4444-4444-444444444444', name: 'Mobile Makeup Service', price: 45 }
    ]
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    email: 'test.provider3@lamsa.test',
    password: 'TestProvider123!',
    phone: '+962799876543',
    businessName: 'Test Nail Studio',
    services: [
      { id: 'd5555555-5555-5555-5555-555555555555', name: 'Test Manicure', price: 15 },
      { id: 'd6666666-6666-6666-6666-666666666666', name: 'Test Gel Nails', price: 30 }
    ]
  }
];

// Function to select a test provider
function selectTestProvider(index = 0) {
  const provider = TEST_PROVIDERS[index % TEST_PROVIDERS.length];
  
  // Set environment variables for the selected provider
  pm.environment.set('test_provider_id', provider.id);
  pm.environment.set('test_provider_email', provider.email);
  pm.environment.set('test_provider_password', provider.password);
  pm.environment.set('test_provider_phone', provider.phone);
  pm.environment.set('test_provider_business_name', provider.businessName);
  
  // Set first service as default
  if (provider.services && provider.services.length > 0) {
    pm.environment.set('test_service_id', provider.services[0].id);
    pm.environment.set('test_service_name', provider.services[0].name);
    pm.environment.set('test_service_price', provider.services[0].price);
    
    // Set alternative service if available
    if (provider.services.length > 1) {
      pm.environment.set('test_service_id_alt', provider.services[1].id);
      pm.environment.set('test_service_name_alt', provider.services[1].name);
      pm.environment.set('test_service_price_alt', provider.services[1].price);
    }
  }
  
  console.log(`✅ Selected test provider: ${provider.businessName}`);
  console.log(`   Email: ${provider.email}`);
  console.log(`   Services: ${provider.services.map(s => s.name).join(', ')}`);
  
  return provider;
}

// Function to handle provider authentication
async function authenticateProvider(email, password) {
  // Check if we already have a valid token
  const existingToken = pm.environment.get('provider_auth_token');
  const tokenExpiry = pm.environment.get('provider_token_expiry');
  
  if (existingToken && tokenExpiry && new Date(tokenExpiry) > new Date()) {
    console.log('✅ Using existing valid auth token');
    return existingToken;
  }
  
  console.log('🔐 Authenticating provider...');
  
  // Make login request
  const loginRequest = {
    url: pm.environment.get('base_url') + '/api/auth/provider/login',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': pm.environment.get('csrf_token') || ''
    },
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        email: email,
        password: password
      })
    }
  };
  
  pm.sendRequest(loginRequest, function (err, response) {
    if (err) {
      console.error('❌ Login request failed:', err);
      return;
    }
    
    if (response.code === 200 || response.code === 201) {
      const responseData = response.json();
      if (responseData.success && responseData.data.token) {
        // Store the token
        pm.environment.set('provider_auth_token', responseData.data.token);
        
        // Set token expiry (1 hour from now)
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1);
        pm.environment.set('provider_token_expiry', expiry.toISOString());
        
        // Store provider info
        if (responseData.data.provider) {
          pm.environment.set('current_provider_id', responseData.data.provider.id);
          pm.environment.set('current_provider_email', responseData.data.provider.email);
        }
        
        console.log('✅ Provider authenticated successfully');
        console.log('   Token stored in environment');
      } else {
        console.error('❌ Login response missing token');
      }
    } else {
      console.error('❌ Login failed with status:', response.code);
      console.error('   Response:', response.json());
    }
  });
}

// Main execution
console.log('🔧 Setting up test provider for API testing...');

// Determine which provider to use
let providerIndex = 0;

// Check if a specific provider is requested
if (pm.variables.get('use_provider_2')) {
  providerIndex = 1;
} else if (pm.variables.get('use_provider_3')) {
  providerIndex = 2;
}

// Select and setup the test provider
const selectedProvider = selectTestProvider(providerIndex);

// Authenticate if this is a provider endpoint
const currentUrl = pm.request.url.toString();
if (currentUrl.includes('/provider/') || currentUrl.includes('/providers')) {
  authenticateProvider(selectedProvider.email, selectedProvider.password);
}

// Set authorization header if we have a token
const authToken = pm.environment.get('provider_auth_token');
if (authToken) {
  pm.request.headers.add({
    key: 'Authorization',
    value: `Bearer ${authToken}`
  });
  console.log('✅ Authorization header set');
}

// Helper function to generate test data
function generateTestData() {
  const timestamp = Date.now();
  
  return {
    // Booking data
    bookingDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      return date.toISOString().split('T')[0];
    })(),
    bookingTime: '14:00',
    bookingNotes: 'Test booking created at ' + new Date().toISOString(),
    
    // Customer data
    customerName: `Test Customer ${timestamp}`,
    customerPhone: `+96279${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    customerEmail: `customer${timestamp}@test.com`,
    
    // Unique identifiers
    uniqueId: timestamp,
    requestId: `req_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Set test data in environment
const testData = generateTestData();
Object.keys(testData).forEach(key => {
  pm.environment.set(`test_${key}`, testData[key]);
});

console.log('✅ Test data generated and stored in environment');
console.log('📝 Ready for provider API testing!');