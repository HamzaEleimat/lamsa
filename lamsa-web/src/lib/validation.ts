export function validateJordanianPhone(phone: string): boolean {
  const cleanedPhone = phone.replace(/\s/g, '');
  const phoneRegex = /^(07[7-9]\d{7}|7[7-9]\d{7})$/;
  return phoneRegex.test(cleanedPhone);
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as Jordan phone number
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  } else {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)}`.trim();
  }
}

export function getFullPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('07')) {
    return `+962${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('7')) {
    return `+962${cleaned}`;
  }
  
  return `+962${cleaned}`;
}