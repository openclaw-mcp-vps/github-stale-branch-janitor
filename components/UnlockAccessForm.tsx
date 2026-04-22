"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UnlockAccessFormProps = {
  defaultEmail: string;
};

export function UnlockAccessForm({ defaultEmail }: UnlockAccessFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/paywall/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not unlock access yet.");
      }

      setMessage("Access confirmed. Reloading dashboard...");
      window.location.reload();
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Could not unlock access yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="purchase-email">Purchase email</Label>
        <Input
          id="purchase-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Verifying..." : "I Completed Checkout"}
      </Button>

      {message ? <p className="text-sm text-[#79c0ff]">{message}</p> : null}
    </form>
  );
}
