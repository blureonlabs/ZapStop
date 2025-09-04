require('dotenv').config({ path: '.env.local' });

console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
console.log('First 20 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'N/A');
