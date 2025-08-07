/**
 * Test Data Generation Functions
 * Reusable functions for generating test data specific to Jordan market
 */

// Generate future dates
function generateFutureDates() {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 3);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    pm.environment.set("future_date", futureDate.toISOString().split('T')[0]);
    pm.environment.set("booking_date", futureDate.toISOString().split('T')[0]);
    pm.environment.set("next_week_date", nextWeek.toISOString().split('T')[0]);
    
    return {
        futureDate: futureDate.toISOString().split('T')[0],
        nextWeek: nextWeek.toISOString().split('T')[0]
    };
}

// Generate Jordanian phone number
function generateJordanianPhone() {
    const prefixes = ['77', '78', '79'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    const phone = `+962${prefix}${number}`;
    
    pm.environment.set("random_jordan_phone", phone);
    return phone;
}

// Generate test customer data
function generateCustomerData() {
    const timestamp = Date.now();
    const email = `customer${timestamp}@example.com`;
    const phone = `079${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
    
    pm.environment.set("test_customer_email", email);
    pm.environment.set("test_customer_phone", phone);
    
    return { email, phone };
}

// Generate Arabic test data
function generateArabicTestData() {
    const arabicNames = ['أحمد محمد', 'فاطمة علي', 'محمد أحمد', 'زينب حسن'];
    const arabicBusinessNames = ['صالون الجمال', 'مركز التجميل', 'صالون الأناقة'];
    const arabicServices = ['قص الشعر', 'صبغة الشعر', 'مانيكير', 'تنظيف الوجه'];
    
    const customerName = arabicNames[Math.floor(Math.random() * arabicNames.length)];
    const businessName = arabicBusinessNames[Math.floor(Math.random() * arabicBusinessNames.length)];
    const serviceName = arabicServices[Math.floor(Math.random() * arabicServices.length)];
    
    pm.environment.set("arabic_customer_name", customerName);
    pm.environment.set("arabic_business_name", businessName);
    pm.environment.set("arabic_service_name", serviceName);
    
    return { customerName, businessName, serviceName };
}

// Generate booking data
function generateBookingData() {
    const bookingTimes = ['09:00', '10:30', '14:00', '15:30', '17:00'];
    const time = bookingTimes[Math.floor(Math.random() * bookingTimes.length)];
    
    pm.environment.set("booking_time", time);
    
    // Generate test IDs
    pm.environment.set("test_service_id", "service-test-" + pm.variables.replaceIn("{{$randomUUID}}"));
    pm.environment.set("test_booking_id", "booking-test-" + pm.variables.replaceIn("{{$randomUUID}}"));
    
    return { time };
}

// Generate all test data at once
function generateAllTestData() {
    generateFutureDates();
    generateJordanianPhone();
    generateCustomerData();
    generateArabicTestData();
    generateBookingData();
    
    console.log("Test data generated successfully");
}

// Export functions for use in Postman
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateFutureDates,
        generateJordanianPhone,
        generateCustomerData,
        generateArabicTestData,
        generateBookingData,
        generateAllTestData
    };
}