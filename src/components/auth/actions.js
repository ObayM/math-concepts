'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState, formData) {
  const supabase = await createClient();

  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { message: 'Email and password are required.' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: 'Invalid credentials. Please try again.' };
  }

  revalidatePath('/', 'layout');
  redirect('/projects');
}

export async function signup(prevState, formData) {
  const supabase = await createClient();
  
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { message: 'Please provide both an email and a password.' };
  }


  if (password.length < 6) {
    return { message: 'Password must be at least 6 characters long.' };
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Supabase signup error:', error);

    return { message: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(`/auth/email-confirm?email=${encodeURIComponent(email)}`);
}


export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

