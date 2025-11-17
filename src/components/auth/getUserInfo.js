import { createClient } from '@/utils/supabase/server';

export async function getUserInfo() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return null;

  const user = authData.user;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile not found:', profileError);
    return { user, profile: null };
  }

  return { user, profile };
}
