"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle } from "lucide-react";

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkVerification() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setEmail(user.email || "");
        if (user.email_confirmed_at) {
          setVerified(true);
          setTimeout(() => {
            router.push("/");
          }, 2000);
        }
      }
    }

    checkVerification();
    
    // Check every 2 seconds if email is verified
    const interval = setInterval(checkVerification, 2000);
    
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full text-center">
        {verified ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Email Verified!</h1>
            <p className="text-gray-400">Redirecting to your dashboard...</p>
          </>
        ) : (
          <>
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">Verify Your Email</h1>
            <p className="text-gray-400 mb-4">
              We've sent a verification email to:
            </p>
            <p className="text-white font-medium mb-6">{email}</p>
            <p className="text-sm text-gray-500">
              Please check your inbox and click the verification link to continue.
            </p>
            <p className="text-xs text-gray-600 mt-4">
              This page will automatically update when you verify your email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

