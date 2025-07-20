export const validateJordanianPhone = (phone: string): boolean => {
  // Remove any spaces or special characters
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
  
  // Jordanian mobile numbers start with 7 and have 8 digits total
  // Valid prefixes: 77, 78, 79
  const jordanianMobileRegex = /^7[789]\d{6}$/;
  
  return jordanianMobileRegex.test(cleanPhone);
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Format as 7X XXX XXXX
  if (cleanPhone.length >= 2) {
    let formatted = cleanPhone.substring(0, 2);
    if (cleanPhone.length > 2) {
      formatted += ' ' + cleanPhone.substring(2, 5);
    }
    if (cleanPhone.length > 5) {
      formatted += ' ' + cleanPhone.substring(5, 9);
    }
    return formatted;
  }
  
  return cleanPhone;
};

export const getFullPhoneNumber = (phone: string, countryCode: string = '+962'): string => {
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
  return `${countryCode}${cleanPhone}`;
};