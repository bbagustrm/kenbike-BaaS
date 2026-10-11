"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormFieldProps = React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  description?: string;
  errors?: string[];
};

/** Label + input + pesan error yang terhubung untuk pembaca layar. */
export function FormField({ name, label, description, errors, id, ...inputProps }: FormFieldProps) {
  const inputId = id ?? name;
  const error = errors?.[0];
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
        {...inputProps}
      />
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}
