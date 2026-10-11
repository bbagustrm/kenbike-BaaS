"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState } from "@/lib/action-state";

import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialActionState);

  return (
    <div className="space-y-6">
      <form action={action} noValidate>
        <FieldGroup>
          <FormAlert state={state} />
          {state.status !== "success" && (
            <>
              <FormField
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                required
                defaultValue={state.values?.email}
                errors={state.fieldErrors?.email}
              />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Spinner />}
                Kirim tautan reset
              </Button>
            </>
          )}
        </FieldGroup>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Ingat password?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
