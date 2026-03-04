"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Workflow Editor</h1>
          <p className="mt-2 text-muted-foreground">
            Build visual workflows with AI-powered nodes
          </p>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            variant={mode === "sign-in" ? "default" : "outline"}
            onClick={() => setMode("sign-in")}
          >
            Sign In
          </Button>
          <Button
            variant={mode === "sign-up" ? "default" : "outline"}
            onClick={() => setMode("sign-up")}
          >
            Sign Up
          </Button>
        </div>

        <div className="flex justify-center">
          {mode === "sign-in" ? (
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-card border border-border shadow-lg",
                },
              }}
            />
          ) : (
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-card border border-border shadow-lg",
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
