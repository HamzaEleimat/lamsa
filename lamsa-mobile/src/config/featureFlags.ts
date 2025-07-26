/**
 * Feature flags for controlling app behavior
 */
export const featureFlags = {
  // Use user ID as provider ID directly without lookup
  // Set to true if provider records don't exist in the database
  USE_USER_ID_AS_PROVIDER_ID: true,

  // Skip provider record validation
  // Set to true to bypass provider existence checks
  SKIP_PROVIDER_VALIDATION: false,
};
