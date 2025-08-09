/**
 * Postman Pre-request Script for Provider Authentication
 * This script handles CSRF token retrieval and provider authentication
 * 
 * Add this to your collection's Pre-request Scripts tab
 */

// Test Provider Configuration
const TEST_PROVIDERS = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    email: 'test.provider1@lamsa.test',
    password: 'TestProvider123!',
    phone: '+962781234567',
    businessName: 'Test Beauty Salon'
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    email: 'test.provider2@lamsa.test',
    password: 'TestProvider123!',
    phone: '+962787654321',
    businessName: 'Test Mobile Stylist'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    email: 'test.provider3@lamsa.test',
    password: 'TestProvider123!',
    phone: '+962799876543',
    businessName: 'Test Nail Studio'
  }
];

// Step 1: Get CSRF Token (synchronous)
function getCSRFToken(callback) {
  const csrfRequest = {
    url: pm.environment.get('base_url') + '/api/csrf-token',
    method: 'GET',
    header: {
      'Content-Type': 'application/json'
    }
  };

  pm.sendRequest(csrfRequest, (err, response) => {
    if (err) {
      console.error('❌ Failed to get CSRF token:', err);
      callback(null);
      return;
    }

    if (response.code === 200) {
      const data = response.json();
      if (data.csrfToken) {
        console.log('✅ CSRF token retrieved');
        pm.environment.set('csrf_token', data.csrfToken);
        
        // Also get the cookie value
        const cookies = response.headers.get('Set-Cookie');
        if (cookies) {
          // Extract CSRF cookie for proper validation
          const csrfCookie = cookies.match(/csrf-token=([^;]+)/);
          if (csrfCookie) {
            pm.environment.set('csrf_cookie', csrfCookie[1]);
          }
        }
        
        callback(data.csrfToken);
      } else {
        console.error('❌ No CSRF token in response');
        callback(null);
      }
    } else {
      console.error('❌ Failed to get CSRF token, status:', response.code);
      callback(null);
    }
  });
}

// Step 2: Setup Provider Credentials
function setupProviderCredentials() {
  // Default to first provider
  const provider = TEST_PROVIDERS[0];
  
  console.log('📝 Setting up test provider credentials:');
  console.log(`   Email: ${provider.email}`);
  console.log(`   Business: ${provider.businessName}`);
  
  // Set credentials in environment
  pm.environment.set('provider_email', provider.email);
  pm.environment.set('provider_password', provider.password);
  pm.environment.set('provider_phone', provider.phone);
  pm.environment.set('provider_id', provider.id);
  
  return provider;
}

// Main execution
console.log('🔧 Preparing provider authentication test...\n');

// Check if this is a login request
const isLoginRequest = pm.request.url.toString().includes('/auth/provider/login');

if (isLoginRequest) {
  console.log('🔐 This is a login request - setting up credentials and CSRF token\n');
  
  // Get CSRF token first
  getCSRFToken((token) => {
    if (token) {
      // Setup provider credentials
      const provider = setupProviderCredentials();
      
      // Set request body with credentials
      pm.request.body = {
        mode: 'raw',
        raw: JSON.stringify({
          email: provider.email,
          password: provider.password
        })
      };
      
      // Set headers
      pm.request.headers.add({
        key: 'Content-Type',
        value: 'application/json'
      });
      
      pm.request.headers.add({
        key: 'X-CSRF-Token',
        value: token
      });
      
      console.log('✅ Request configured with:');
      console.log('   - CSRF Token in header');
      console.log('   - Provider credentials in body');
      console.log('   - Content-Type: application/json\n');
    } else {
      console.error('❌ Could not get CSRF token - request may fail');
    }
  });
} else {
  // For other requests, just ensure we have auth token
  const authToken = pm.environment.get('provider_auth_token');
  if (authToken) {
    pm.request.headers.add({
      key: 'Authorization',
      value: `Bearer ${authToken}`
    });
    console.log('✅ Authorization header added');
  }
  
  // Still get CSRF token for other POST requests
  if (pm.request.method === 'POST' || pm.request.method === 'PUT' || pm.request.method === 'DELETE') {
    getCSRFToken((token) => {
      if (token) {
        pm.request.headers.add({
          key: 'X-CSRF-Token',
          value: token
        });
        console.log('✅ CSRF token added to request');
      }
    });
  }
}

// Store response token after successful login (add to Tests tab)
/*
// Add this to the Tests tab of your login request:
if (pm.response.code === 200 || pm.response.code === 201) {
  const responseData = pm.response.json();
  if (responseData.success && responseData.data.token) {
    pm.environment.set('provider_auth_token', responseData.data.token);
    console.log('✅ Auth token saved for future requests');
  }
}
*/