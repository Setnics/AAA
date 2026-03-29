import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ttkyervdmujjpliepxyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3llcnZkbXVqanBsaWVweHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjI5NTIsImV4cCI6MjA5MDI5ODk1Mn0.PRs03IunHXg8mBMlH6Bz7PCEaPfe5HNGpHViqEadP7o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
