/* Supabase client.
 *
 * The URL and publishable key below are safe to ship in client code: they only
 * grant what the Row Level Security policies in supabase-schema.sql allow.
 * The secret / service_role key must NEVER appear here — it bypasses those
 * policies entirely.
 *
 * Session persistence uses AsyncStorage, so a signed-in user stays signed in
 * across restarts (FR3). On web, AsyncStorage maps to localStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aehsittoxionkykdxell.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Vt0zZk_9Ffq69DP7RKQNRQ_ZdG3xFPR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection: this is a mobile app, not a web redirect flow.
    detectSessionInUrl: false,
  },
});
