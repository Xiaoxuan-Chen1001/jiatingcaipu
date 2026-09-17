import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kffdrqxcqjyobcwanmrr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmRycXhjcWp5b2Jjd2FubXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDc0ODcsImV4cCI6MjEwNDk4MzQ4N30.Ck7YPF5QBB0kzpjtLh-YuXaGOrZQxssnXT6xqMqjUtI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
