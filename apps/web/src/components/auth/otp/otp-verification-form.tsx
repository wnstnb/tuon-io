"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Icons } from "../../ui/icons";
import { Label } from "../../ui/label";

interface OtpVerificationFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onVerifyOtp: (email: string, token: string) => Promise<void>;
  email: string;
}

export function OtpVerificationForm({
  className,
  onVerifyOtp,
  email,
  ...props
}: OtpVerificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    
    if (!token || token.length < 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      await onVerifyOtp(email, token);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col space-y-2 text-center">
        <h3 className="text-xl font-semibold tracking-tight">
          Enter verification code
        </h3>
        <p className="text-sm text-muted-foreground">
          We sent a verification code to {email}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="token">Verification Code</Label>
            <Input
              id="token"
              placeholder="123456"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isLoading}
              value={token}
              onChange={(e) => {
                // Only allow numbers and limit to 6 characters
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setToken(value);
              }}
              className="text-center text-lg tracking-widest"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isLoading || token.length < 6}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Verify
          </Button>
        </div>
      </form>
      
      <div className="text-center text-sm">
        <span className="text-muted-foreground">
          Didn't receive a code?{` `}
        </span>
        <Button 
          variant="link" 
          className="p-0 h-auto text-sm"
          disabled={isLoading}
          onClick={() => window.location.href = "/auth/login"}
        >
          Try again
        </Button>
      </div>
    </div>
  );
} 