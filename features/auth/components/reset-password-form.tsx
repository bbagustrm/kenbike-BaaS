"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState } from "@/lib/action-state";

import { updatePassword } from "../actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialActionState);

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormAlert state={state} />
        <FormField
          name="password"
          type="password"
          label="Password baru"
          autoComplete="new-password"
          description="Minimal 8 karakter."
          required
          errors={state.fieldErrors?.password}
        />
        <FormField
          name="confirmPassword"
          type="password"
          label="Ulangi password baru"
          autoComplete="new-password"
          required
          errors={state.fieldErrors?.confirmPassword}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          Simpan password
        </Button>
      </FieldGroup>
    </form>
  );
}
