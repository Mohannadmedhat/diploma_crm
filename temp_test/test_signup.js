import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqwlypzvgufqnveyyspm.supabase.co';
const supabaseAnonKey = 'sb_publishable_u99zEgEB8snzxYmKBEN_HQ_cCyHP-f0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signupUser(email, password) {
  console.log(`Trying to register ${email}...`);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {} // custom metadata if any
      }
    });
    if (error) {
      console.log(`❌ Registration failed: ${error.status} - ${error.message}`);
    } else {
      console.log(`✅ Registration success! User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Identities:`, data.user.identities);
    }
  } catch (err) {
    console.error(`💥 Unexpected error:`, err);
  }
  console.log('----------------------------------------');
}

async function run() {
  await signupUser('mohannad@diploma.local', 'Mohannad123');
  await signupUser('nariman@diploma.local', 'Nariman123');
}

run();
