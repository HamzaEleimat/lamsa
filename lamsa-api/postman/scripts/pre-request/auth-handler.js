/**
 * Authentication Handler for Postman Collections
 * Manages token validation and automatic refresh
 */

// Check if token exists and is valid
function validateToken(tokenKey) {
    const token = pm.environment.get(tokenKey);
    
    if (!token) {
        console.log(`No ${tokenKey} found. Please run the Test-Data-Setup collection first.`);
        return false;
    }
    
    try {
        // Decode JWT token to check expiration
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.log(`Invalid token format for ${tokenKey}`);
            return false;
        }
        
        // Decode payload (base64)
        const payload = JSON.parse(atob(parts[1]));
        
        // Check expiration (with 5 minute buffer)
        const now = Math.floor(Date.now() / 1000);
        const expirationBuffer = 300; // 5 minutes
        
        if (payload.exp && payload.exp - expirationBuffer < now) {
            console.log(`Token ${tokenKey} is expired or expiring soon`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log(`Error validating ${tokenKey}:`, error.message);
        return false;
    }
}

// Refresh customer token
async function refreshCustomerToken() {
    const email = pm.environment.get('test_customer_email');
    const password = pm.environment.get('test_customer_password');
    
    if (!email || !password) {
        throw new Error('Customer credentials not found. Run Test-Data-Setup collection first.');
    }
    
    const loginRequest = {
        url: pm.environment.get('base_url') + '/api/auth/customer/login',
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
    
    return new Promise((resolve, reject) => {
        pm.sendRequest(loginRequest, (err, response) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (response.code !== 200) {
                reject(new Error(`Login failed: ${response.status}`));
                return;
            }
            
            const data = response.json();
            if (data.success && data.data.accessToken) {
                pm.environment.set('customer_token', data.data.accessToken);
                console.log('Customer token refreshed successfully');
                resolve(data.data.accessToken);
            } else {
                reject(new Error('Login response missing token'));
            }
        });
    });
}

// Refresh provider token
async function refreshProviderToken() {
    const email = pm.environment.get('test_provider_email');
    const password = pm.environment.get('test_provider_password');
    
    if (!email || !password) {
        throw new Error('Provider credentials not found. Run Test-Data-Setup collection first.');
    }
    
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
    
    return new Promise((resolve, reject) => {
        pm.sendRequest(loginRequest, (err, response) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (response.code !== 200) {
                reject(new Error(`Provider login failed: ${response.status}`));
                return;
            }
            
            const data = response.json();
            if (data.success && data.data.accessToken) {
                pm.environment.set('test_provider_token', data.data.accessToken);
                console.log('Provider token refreshed successfully');
                resolve(data.data.accessToken);
            } else {
                reject(new Error('Provider login response missing token'));
            }
        });
    });
}

// Main authentication handler
async function ensureAuthentication() {
    // Check which type of authentication is needed based on the current request
    const authHeader = pm.request.headers.get('Authorization');
    
    if (!authHeader) {
        console.log('No Authorization header in request');
        return;
    }
    
    // Determine token type from the header
    if (authHeader.includes('{{customer_token}}')) {
        if (!validateToken('customer_token')) {
            console.log('Refreshing customer token...');
            try {
                await refreshCustomerToken();
            } catch (error) {
                console.error('Failed to refresh customer token:', error.message);
                throw error;
            }
        }
    } else if (authHeader.includes('{{test_provider_token}}') || authHeader.includes('{{provider_token}}')) {
        if (!validateToken('test_provider_token')) {
            console.log('Refreshing provider token...');
            try {
                await refreshProviderToken();
            } catch (error) {
                console.error('Failed to refresh provider token:', error.message);
                throw error;
            }
        }
    }
}

// Generate dynamic test data
function generateDynamicData() {
    // Set booking date (3 days in future)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    pm.environment.set('booking_date', futureDate.toISOString().split('T')[0]);
    
    // Set random booking time within business hours
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    const randomTime = times[Math.floor(Math.random() * times.length)];
    pm.environment.set('booking_time', randomTime);
    
    // Generate random phone if needed
    if (!pm.environment.get('random_jordan_phone')) {
        const prefixes = ['77', '78', '79'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        pm.environment.set('random_jordan_phone', `+962${prefix}${number}`);
    }
}

// Execute authentication check and data generation
(async () => {
    try {
        // Generate dynamic data first
        generateDynamicData();
        
        // Then ensure authentication
        await ensureAuthentication();
    } catch (error) {
        console.error('Pre-request script error:', error);
        // Don't throw to allow request to proceed (will fail with 401 if auth is truly required)
    }
})();