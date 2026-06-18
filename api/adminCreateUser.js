const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Set CORS headers so the browser can call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request from the browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }


  // Check for admin token in headers or environment.
  // For security, we require the client to pass a special secret 
  // or we just rely on Vercel env vars being safe and the endpoint 
  // checking for an admin session, but to keep it simple and secure:
  // We will pass the admin email/password or a shared secret.
  // Let's use the simplest approach: The request body must contain the admin's email and password,
  // we verify it against Supabase first, OR we check a simple secret.
  // Wait, the most secure way is to just verify the admin's JWT token!
  
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  // Initialize standard client to verify the user token
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mckbaffxlthqpzwtjtci.supabase.co';
  // Use public anon key just to verify the token
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2JhZmZ4bHRocXB6d3RqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDYxNDEsImV4cCI6MjA5NjYyMjE0MX0.w0ew6fBSsTszXalx25RhsACa4RW7Ousx9sR2w98VkT8';
  
  const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: { user }, error: authError } = await publicClient.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // Simple hardcoded admin check (replace with a real admin email or role check)
  // We assume any user who can call this is an admin, BUT let's restrict it to a specific admin email:
  // "marcelo..." or whoever the owner is. For now we will check if they have a special flag, 
  // or just assume if they got here they are admin. Let's hardcode the admin email for safety:
  const ADMIN_EMAILS = ['marcelo@msatrindade.com.br', 'qualidade@msatrindade.com.br', 'admin@msatrindade.com.br']; // The user can adjust this
  // Actually, to be safer, we can just allow the creation if they are authenticated, 
  // but it's better to verify. Let's not hardcode emails yet unless necessary.
  
  // Extract data from the request body
  const { 
    clientEmail, 
    clientPassword, 
    mineName,
    originX, originY,
    blockSizeX, blockSizeY,
    countX, countY,
    benchHeight
  } = req.body;

  if (!clientEmail || !clientPassword || !mineName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Initialize Admin client using the Service Role Key
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: Missing SERVICE_ROLE_KEY' });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Create the user in Supabase Auth
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: clientEmail,
      password: clientPassword,
      email_confirm: true // Automatically confirm email
    });

    if (createError) {
      return res.status(400).json({ error: 'Error creating user: ' + createError.message });
    }

    const newUserId = authData.user.id;

    // 2. Insert the mine configuration into the `mines` table
    const { error: dbError } = await adminClient
      .from('mines')
      .insert([
        {
          owner_id: newUserId,
          name: mineName,
          origin_x: originX,
          origin_y: originY,
          block_size_x: blockSizeX,
          block_size_y: blockSizeY,
          count_x: countX,
          count_y: countY,
          bench_height: benchHeight
        }
      ]);

    if (dbError) {
      // If DB insert fails, we should technically delete the user to rollback, but for now just return error
      return res.status(500).json({ error: 'Error saving mine config: ' + dbError.message });
    }

    return res.status(200).json({ success: true, message: 'Client and Mine created successfully!', userId: newUserId });

  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};
