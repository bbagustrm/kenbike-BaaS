"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState } from "@/lib/action-state";

import { updateProfile } from "../actions";

type ProfileFormProps = {
  email: string | null;
  fullName: string | null;
  phone: string | null;
};

export function ProfileForm({ email, fullName, phone }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initialActionState);

  return (
    <form action={action} noValidate className="max-w-md">
      <FieldGroup>
        <FormAlert state={state} />
        <FormField name="email" label="Email" type="email" value={email ?? ""} readOnly disabled />
        <FormField
          name="fullName"
          label="Nama lengkap"
          autoComplete="name"
          required
          defaultValue={state.values?.fullName ?? fullName ?? ""}
          errors={state.fieldErrors?.fullName}
        />
        <FormField
          name="phone"
          label="Nomor HP"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081234567890"
          description="Dipakai kurir untuk menghubungimu."
          defaultValue={state.values?.phone ?? phone ?? ""}
          errors={state.fieldErrors?.phone}
        />
        <div>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Simpan
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
