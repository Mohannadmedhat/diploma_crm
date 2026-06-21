import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqwlypzvgufqnveyyspm.supabase.co';
const supabaseAnonKey = 'sb_publishable_u99zEgEB8snzxYmKBEN_HQ_cCyHP-f0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const users = [
  { username: 'ziad', password: 'Ziad123' },
  { username: 'abdelrahman', password: 'Abdelrahman123' },
  { username: 'samah', password: 'Samah123' },
  { username: 'soha', password: 'Soha123' },
  { username: 'nariman', password: 'Nariman123' },
  { username: 'mohannad', password: 'Mohannad123' }
];

async function registerUser(username, password) {
  const email = `${username.toLowerCase()}@diploma.local`;
  console.log(`Registering ${email}...`);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log(`ℹ️ ${email} is already registered.`);
      } else {
        console.log(`❌ Failed to register ${email}: ${error.message}`);
      }
    } else {
      console.log(`✅ Registered successfully! User ID: ${data.user.id}`);
    }
  } catch (err) {
    console.error(`💥 Unexpected error for ${email}:`, err);
  }
}

async function run() {
  for (const user of users) {
    await registerUser(user.username, user.password);
  }
  console.log('\nDone registering users.');
}

run();
