import { UserRole } from '../types';
import { supabase } from '../services/supabase';

/**
 * Determine a user's role based on available data
 * Since there's no role column in the users table, we infer it from other sources
 */
export async function determineUserRole(userId: string): Promise<UserRole> {
  try {
    // Check if user has a provider record
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (provider) {
      return UserRole.PROVIDER;
    }

    // Check if user has any services (might be a provider without a provider record)
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('provider_id', userId)
      .limit(1);

    if (services && services.length > 0) {
      return UserRole.PROVIDER;
    }

    // Default to customer if no provider indicators found
    return UserRole.CUSTOMER;
  } catch (error) {
    console.error('Error determining user role:', error);
    // Default to customer on error
    return UserRole.CUSTOMER;
  }
}

/**
 * Check if a user is a provider
 */
export async function isUserProvider(userId: string): Promise<boolean> {
  const role = await determineUserRole(userId);
  return role === UserRole.PROVIDER;
}

/**
 * Get role from auth metadata if available
 * This is used when role is stored in Supabase Auth metadata
 */
export function getRoleFromAuthMetadata(user: any): UserRole | undefined {
  // Check auth metadata
  if (user?.user_metadata?.role) {
    return user.user_metadata.role as UserRole;
  }
  
  // Check app metadata (set by admin)
  if (user?.app_metadata?.role) {
    return user.app_metadata.role as UserRole;
  }
  
  return undefined;
}