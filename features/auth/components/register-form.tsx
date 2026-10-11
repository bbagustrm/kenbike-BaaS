"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState } from "@/lib/action-state";

import { signUp } from "../actions";
import { GoogleButton } from "./google-button";

export function RegisterForm() {
  const next = useSearchParams().get("next") ?? undefined;
  const [state, action, pending] = useActionState(signUp, initialActionState);

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center">
        <MailCheckIcon className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Cek email kamu</h2>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <p className="text-xs text-muted-foreground">
          Tidak menerima email? Periksa folder spam, atau daftar ulang beberapa menit lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next} />
      <FieldSeparator className="my-0">atau dengan email</FieldSeparator>

      <form action={action} noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <FieldGroup>
          <FormAlert state={state} />
          <FormField
            name="fullName"
            label="Nama lengkap"
            autoComplete="name"
            required
            defaultValue={state.values?.fullName}
            errors={state.fieldErrors?.fullName}
          />
          <FormField
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            errors={state.fieldErrors?.email}
          />
          <FormField
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            description="Minimal 8 karakter."
            required
            errors={state.fieldErrors?.password}
          />
          <FormField
            name="confirmPassword"
            type="password"
            label="Ulangi password"
            autoComplete="new-password"
            required
            errors={state.fieldErrors?.confirmPassword}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Spinner />}
            Daftar
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
