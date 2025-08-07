import { supabaseAdmin } from './src/config/supabase-simple';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupProvider() {
  if (!supabaseAdmin) {
    console.log('❌ Admin client not available');
    return;
  }
  
  console.log('🧹 Cleaning up provider@example.com...');
  
  try {
    // Find the auth user
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    const orphan = users?.find(u => u.email === 'provider@example.com');
    if (orphan) {
      console.log('Found orphaned auth user:', orphan.id);
      await supabaseAdmin.auth.admin.deleteUser(orphan.id);
      console.log('✅ Deleted orphaned auth user');
    } else {
      console.log('No orphaned auth user found');
    }
    
    // Check for provider record
    const { data: provider } = await supabaseAdmin
      .from('providers')
      .select('id')
      .eq('email', 'provider@example.com')
      .single();
      
    if (provider) {
      console.log('Found provider record:', provider.id);
      const { error } = await supabaseAdmin
        .from('providers')
        .delete()
        .eq('id', provider.id);
      
      if (!error) {
        console.log('✅ Deleted provider record');
      }
    } else {
      console.log('No provider record found');
    }
  } catch (err) {
    console.log('Error during cleanup:', err);
  }
}

cleanupProvider()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });