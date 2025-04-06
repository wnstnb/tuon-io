"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LoginWithEmailInput } from "./Login";

export async function login(input: LoginWithEmailInput) {
  const supabase = createClient();

  if (!input.password) {
    // Handle case where password is not provided
    redirect("/auth/login?error=true");
    return;
  }

  const data = {
    email: input.email,
    password: input.password,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error(error);
    redirect("/auth/login?error=true");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function loginWithOtp(email: string, redirectTo: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error(error);
    throw error;
  }

  // Redirect to the OTP verification page
  redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
}
