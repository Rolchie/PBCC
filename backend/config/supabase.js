
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    'Supabase environment variables are missing.'
  );
}

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
};

// Privileged backend client for database operations.
// Never use this client to sign in individual users.
const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  options
);

// Separate client for password authentication.
// Its session state must not affect the database client.
const authClient = createClient(
  supabaseUrl,
  supabaseSecretKey,
  options
);

module.exports = supabase;
module.exports.authClient = authClient;
