"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function verifyOtp(email: string, token: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });

  if (error) {
    console.error("OTP verification error:", error);
    throw error;
  }

  // Successfully verified OTP
  revalidatePath("/", "layout");
  redirect("/");
} 