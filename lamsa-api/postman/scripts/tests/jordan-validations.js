/**
 * Jordan-specific Validation Functions
 * Reusable test functions for validating Jordan market requirements
 */

// Validate Jordanian phone number format
function validateJordanianPhone(phone) {
    const isValid = /^\+962(77|78|79)\d{7}$/.test(phone);
    
    pm.test("Phone number is in Jordanian format", function () {
        pm.expect(phone).to.match(/^\+962(77|78|79)\d{7}$/);
    });
    
    return isValid;
}

// Validate JOD currency amount
function validateJODAmount(amount) {
    pm.test("Amount is in valid JOD format", function () {
        pm.expect(amount).to.be.a('number');
        pm.expect(amount).to.be.at.least(0);
        pm.expect(amount).to.be.at.most(10000); // Reasonable max for beauty services
    });
    
    // Check decimal places (JOD uses 3 decimal places)
    pm.test("Amount has valid decimal places for JOD", function () {
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        pm.expect(decimalPlaces).to.be.at.most(3);
    });
}

// Validate Arabic content is present
function validateArabicContent(text, fieldName = "content") {
    if (!text || typeof text !== 'string') {
        pm.test(`${fieldName} should contain text`, function () {
            pm.expect(text).to.be.a('string').and.not.empty;
        });
        return false;
    }
    
    pm.test(`${fieldName} contains Arabic text`, function () {
        pm.expect(text).to.match(/[\u0600-\u06FF]/);
    });
    
    return /[\u0600-\u06FF]/.test(text);
}

// Validate business hours (Jordan typical: 8 AM - 10 PM)
function validateBusinessHours(time) {
    pm.test("Time is within Jordanian business hours", function () {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        
        // 8:00 AM = 480 minutes, 10:00 PM = 1320 minutes
        pm.expect(timeInMinutes).to.be.at.least(480);
        pm.expect(timeInMinutes).to.be.at.most(1320);
    });
}

// Validate platform fee structure (Lamsa fixed fees)
function validatePlatformFees(serviceAmount, platformFee) {
    pm.test("Platform fee follows Lamsa structure", function () {
        if (serviceAmount <= 25) {
            pm.expect(platformFee).to.equal(2.00);
        } else {
            pm.expect(platformFee).to.equal(5.00);
        }
    });
}

// Validate date is future (for bookings)
function validateFutureDate(dateString) {
    pm.test("Date is in the future", function () {
        const bookingDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        pm.expect(bookingDate.getTime()).to.be.greaterThan(today.getTime());
    });
}

// Validate date is within booking window (2 hours to 90 days)
function validateBookingWindow(dateString) {
    pm.test("Date is within valid booking window", function () {
        const bookingDate = new Date(dateString);
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
        const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
        
        pm.expect(bookingDate.getTime()).to.be.at.least(twoHoursFromNow.getTime());
        pm.expect(bookingDate.getTime()).to.be.at.most(ninetyDaysFromNow.getTime());
    });
}

// Validate address format for Jordan
function validateJordanianAddress(address) {
    pm.test("Address contains required fields", function () {
        pm.expect(address).to.have.property('city');
        pm.expect(address).to.have.property('area');
        pm.expect(address).to.have.property('street');
    });
    
    // Validate city is in Jordan
    const jordanCities = ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Madaba', 'Jerash', 'Ajloun', 'Karak', 'Tafilah', 'Maan', 'Balqa'];
    pm.test("City is a valid Jordanian city", function () {
        pm.expect(jordanCities.map(c => c.toLowerCase())).to.include(address.city.toLowerCase());
    });
}

// Export functions for use in Postman
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateJordanianPhone,
        validateJODAmount,
        validateArabicContent,
        validateBusinessHours,
        validatePlatformFees,
        validateFutureDate,
        validateBookingWindow,
        validateJordanianAddress
    };
}