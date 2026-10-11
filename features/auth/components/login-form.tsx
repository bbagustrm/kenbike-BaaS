"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState } from "@/lib/action-state";

import { signIn } from "../actions";
import { GoogleButton } from "./google-button";

const LINK_ERRORS: Record<string, string> = {
  link: "Tautan tidak valid atau sudah kedaluwarsa. Silakan coba lagi.",
  oauth: "Login dengan Google gagal. Silakan coba lagi.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""];

  const [state, action, pending] = useActionState(signIn, initialActionState);
  const shown =
    state.status === "idle" && linkError ? { status: "error" as const, message: linkError } : state;

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next} />
      <FieldSeparator className="my-0">atau dengan email</FieldSeparator>

      <form action={action} noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <FieldGroup>
          <FormAlert state={shown} />
          <FormField
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            errors={state.fieldErrors?.email}
          />
          <div className="space-y-2">
            <FormField
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              required
              errors={state.fieldErrors?.password}
            />
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Lupa password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Spinner />}
            Masuk
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </div>
  );
}
