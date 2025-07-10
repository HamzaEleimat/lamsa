import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create Supabase clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Export auth helpers
export const auth = {
  async signOut() {
    return supabase.auth.signOut();
  },
  
  async getSession() {
    return supabase.auth.getSession();
  },
  
  async getUser() {
    return supabase.auth.getUser();
  },
  
  async signUpProvider(providerData: any) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: providerData.email,
        password: providerData.password,
      });
      
      if (authError || !authData.user) {
        return { data: null, error: authError };
      }
      
      // Create provider profile
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .insert({
          id: authData.user.id,
          email: providerData.email,
          phone: providerData.phone,
          business_name_ar: providerData.business_name_ar,
          business_name_en: providerData.business_name_en,
          owner_name: providerData.owner_name,
          latitude: providerData.latitude,
          longitude: providerData.longitude,
          address: providerData.address,
          license_number: providerData.license_number,
        })
        .select()
        .single();
      
      if (providerError) {
        // Rollback auth user if provider creation fails
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        }
        return { data: null, error: providerError };
      }
      
      return { data: { user: authData.user, provider }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  async signInProvider(email: string, password: string) {
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError || !authData.user) {
        return { data: null, error: authError };
      }
      
      // Get provider profile
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (providerError || !provider) {
        return { data: null, error: providerError || new Error('Provider profile not found') };
      }
      
      return { data: { user: authData.user, provider }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

// Helper function to handle Supabase operations
export async function handleSupabaseOperation<T>(
  queryBuilder: any
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryBuilder;
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

// Simple database helpers
export const db = {
  users: {
    async findByPhone(phone: string) {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .select('*')
          .eq('phone', phone)
          .single()
      );
    },
    
    async create(userData: any) {
      return handleSupabaseOperation(
        supabase
          .from('users')
          .insert(userData)
          .select()
          .single()
      );
    },
  },
  
  providers: {
    async findByEmail(email: string) {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('email', email)
          .single()
      );
    },
    
    async findByPhone(phone: string) {
      return handleSupabaseOperation(
        supabase
          .from('providers')
          .select('*')
          .eq('phone', phone)
          .single()
      );
    },
  },
};