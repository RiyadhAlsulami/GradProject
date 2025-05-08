// Supabase configuration 
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import env from './env.js';

// Get configuration values
const SUPABASE_CONFIG = {
    supabaseUrl: env.get('SUPABASE_URL'),
    supabaseKey: env.get('SUPABASE_KEY')
};

// Create the Supabase client with persistent sessions and proper headers
const supabase = createClient(
    SUPABASE_CONFIG.supabaseUrl, 
    SUPABASE_CONFIG.supabaseKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        },
        global: {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
    }
);

console.log('Supabase client initialized');

export default SUPABASE_CONFIG;
export { supabase };
