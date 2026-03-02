import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://llrzeexnzgknpwcxdxpm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5a1gq2zrQY1dKY_Br5oA-Q_3JdRGbtj";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
