/**
 * Flexible UUID validation that handles both UUIDs and other ID formats
 */
export function flexibleValidateUUID(id: string, paramName: string = 'id'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!id) {
    throw new Error(`${paramName} is required`);
  }
  
  // If it's a valid UUID, return it normalized
  if (uuidRegex.test(id)) {
    return id.toLowerCase();
  }
  
  // Otherwise, just return the ID as-is (for non-UUID IDs like user IDs)
  console.log(`Using non-UUID ${paramName}:`, id);
  return id;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}