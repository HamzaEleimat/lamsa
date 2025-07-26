/**
 * Re-export Supabase client and utilities from lib
 * This file maintains backward compatibility with existing imports
 * 
 * Note: Since the lib/supabase uses lazy initialization with getSupabase(),
 * we need to create a wrapper that provides the expected interface
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, auth, db, isAuthenticated, getAuthToken, AuthErrorType, categorizeAuthError } from '../lib/supabase';

export { auth, db, isAuthenticated, getAuthToken, AuthErrorType, categorizeAuthError };
export type { Session, User } from '@supabase/supabase-js';

// For backward compatibility, we need to provide a synchronous supabase client
// This uses environment variables directly, which should be available at build time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration not found in environment variables');
}

// Create a supabase client instance for backward compatibility
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : {} as SupabaseClient; // Provide empty object as fallback to prevent runtime errors