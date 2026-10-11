/** Bentuk hasil standar Server Action yang dipakai bersama useActionState. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Nilai yang dikirim (tanpa password) agar form tidak kosong setelah gagal. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };
