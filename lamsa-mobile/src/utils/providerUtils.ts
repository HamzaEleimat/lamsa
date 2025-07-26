import { supabase } from '../services/supabase';
import { featureFlags } from '../config/featureFlags';

/**
 * Get provider ID for a user
 * This utility handles the case where provider records might not exist
 * or where the user ID is used as the provider ID
 */
export async function getProviderIdForUser(userId: string): Promise<string | null> {
  // Quick return if feature flag is set
  if (featureFlags.USE_USER_ID_AS_PROVIDER_ID) {
    return userId;
  }
  
  try {
    // First, try to get the provider record using user_id
    const { data: provider, error } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching provider:', error);
      // Don't return here, continue checking
    }

    // If provider record exists, use its ID
    if (provider) {
      return provider.id;
    }

    // Check if there's a provider with this ID (user might be their own provider ID)
    const { data: providerById } = await supabase
      .from('providers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (providerById) {
      return providerById.id;
    }

    // If no provider record exists, check if this user has any services
    // where they are listed as the provider_id (legacy data)
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('provider_id', userId)
      .limit(1);

    if (services && services.length > 0) {
      // User has services with their user ID as provider_id
      // Continue using user ID for backward compatibility
      return userId;
    }

    // No provider record and no services, use user ID as fallback
    return userId;
  } catch (error) {
    console.error('Error in getProviderIdForUser:', error);
    return userId; // Always fallback to user ID on error
  }
}

/**
 * Ensure a provider record exists for a user
 * Creates one if it doesn't exist
 */
export async function ensureProviderRecord(userId: string, userData: any): Promise<string> {
  try {
    // Check if provider record already exists
    const { data: existingProvider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProvider) {
      return existingProvider.id;
    }

    // Create a new provider record
    const { data: newProvider, error } = await supabase
      .from('providers')
      .insert({
        id: userId, // Use user ID as provider ID for consistency
        user_id: userId,
        name: userData.name || 'Provider',
        email: userData.email,
        phone: userData.phone,
        business_name: userData.name || 'My Business',
        business_name_ar: userData.name || 'عملي',
        business_type: 'salon',
        status: 'active',
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating provider record:', error);
      return userId; // Fallback to user ID
    }

    return newProvider.id;
  } catch (error) {
    console.error('Error in ensureProviderRecord:', error);
    return userId;
  }
}