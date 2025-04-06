"use client";

import { cn } from "@/lib/utils";
import NextImage from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OtpVerificationForm } from "@/components/auth/otp/otp-verification-form";
import { verifyOtp } from "@/components/auth/otp/actions";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

// Create a client component that uses useSearchParams()
function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [error, setError] = useState(false);

  const handleVerifyOtp = async (email: string, token: string) => {
    setError(false);
    try {
      await verifyOtp(email, token);
    } catch (err) {
      setError(true);
      throw err;
    }
  };

  if (!email) {
    // Redirect to login if no email is provided
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold">No email provided</h2>
        <p className="text-muted-foreground text-center">
          Please return to the login page and try again.
        </p>
        <Link href="/auth/login" className={buttonVariants()}>
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="container relative h-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        href="/auth/login"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute md:flex hidden right-4 top-4 md:right-8 md:top-8"
        )}
      >
        Back to Login
      </Link>
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex gap-1 items-center text-lg font-medium">
          <NextImage
            src="/lc_logo.jpg"
            width={36}
            height={36}
            alt="LangChain Logo"
            className="rounded-full"
          />
          Open Canvas
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Verify OTP</h1>
            <Link
              href="/auth/login"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "md:hidden flex"
              )}
            >
              Back to Login
            </Link>
          </div>
          <OtpVerificationForm 
            onVerifyOtp={handleVerifyOtp} 
            email={email} 
          />
          {error && (
            <p className="text-red-500 text-sm text-center">
              There was an error verifying your code. Please try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Create a fallback for when the content is loading
function VerifyOtpFallback() {
  return (
    <div className="container flex items-center justify-center h-screen">
      <div className="animate-pulse">Loading verification page...</div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpFallback />}>
      <VerifyOtpContent />
    </Suspense>
  );
} 