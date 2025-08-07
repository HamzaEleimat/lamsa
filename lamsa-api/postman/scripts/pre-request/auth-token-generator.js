/**
 * JWT Token Generation Functions
 * Reusable functions for generating mock JWT tokens for testing
 */

// Base JWT generation function
function generateJWT(payload) {
    const header = btoa(JSON.stringify({"alg": "HS256", "typ": "JWT"}));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = "mock_signature_" + Date.now();
    return `${header}.${encodedPayload}.${signature}`;
}

// Generate customer token
function generateCustomerToken() {
    const token = generateJWT({
        id: "customer-test-" + pm.variables.replaceIn("{{$randomUUID}}"),
        type: "customer",
        phone: "+962791234567",
        email: "customer@test.com",
        language: "ar",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    });
    
    pm.environment.set("customer_token", token);
    pm.environment.set("customer_user_id", "customer-test-" + pm.variables.replaceIn("{{$randomUUID}}"));
    
    console.log("Customer token generated:", token);
    return token;
}

// Generate provider token
function generateProviderToken() {
    const token = generateJWT({
        id: "provider-test-" + pm.variables.replaceIn("{{$randomUUID}}"),
        type: "provider",
        phone: "+962781111111",
        email: "provider@lamsa.com",
        businessName: "Test Beauty Salon",
        businessNameAr: "صالون تجريبي",
        language: "ar",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    });
    
    pm.environment.set("provider_token", token);
    pm.environment.set("provider_user_id", "provider-test-" + pm.variables.replaceIn("{{$randomUUID}}"));
    
    console.log("Provider token generated:", token);
    return token;
}

// Generate admin token
function generateAdminToken() {
    const token = generateJWT({
        id: "admin-test-" + pm.variables.replaceIn("{{$randomUUID}}"),
        type: "admin",
        phone: "+962771111111",
        email: "admin@lamsa.com",
        role: "super_admin",
        permissions: ["all"],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    });
    
    pm.environment.set("admin_token", token);
    pm.environment.set("admin_user_id", "admin-test-" + pm.variables.replaceIn("{{$randomUUID}}"));
    
    console.log("Admin token generated:", token);
    return token;
}

// Export functions for use in Postman
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateJWT,
        generateCustomerToken,
        generateProviderToken,
        generateAdminToken
    };
}