// supabaseClient.js
// Initialize Supabase client for the T2 Mining application

const SUPABASE_URL = 'https://mckbaffxlthqpzwtjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2JhZmZ4bHRocXB6d3RqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDYxNDEsImV4cCI6MjA5NjYyMjE0MX0.w0ew6fBSsTszXalx25RhsACa4RW7Ousx9sR2w98VkT8';

// The CDN script loads a global `supabase` object with a `createClient` method.
// We attach the instantiated client to `window.supabaseClient` for easy access.
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
