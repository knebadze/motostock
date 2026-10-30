"use client";

import { useEffect, useId, useRef } from "react";

const FIELD_SELECTOR = "input:not([type=hidden]), select, textarea, [role=combobox]";

// Inline field error (WCAG 3.3.1 / 1.3.1): announced when it appears
// (role="alert"), and tied to its field — the input/select/textarea in the
// same field wrapper gets aria-invalid + aria-describedby pointing here, so
// a screen reader reads the error together with the field. Done from here
// (not at each of the ~185 call sites) since every form already renders
// FieldError inside the same wrapper as its field.
export function FieldError({ message }: { message?: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!message) return;
    const field = ref.current?.parentElement?.querySelector<HTMLElement>(FIELD_SELECTOR);
    if (!field) return;
    const previousDescribedBy = field.getAttribute("aria-describedby");
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", previousDescribedBy ? `${previousDescribedBy} ${id}` : id);
    return () => {
      field.removeAttribute("aria-invalid");
      if (previousDescribedBy) field.setAttribute("aria-describedby", previousDescribedBy);
      else field.removeAttribute("aria-describedby");
    };
  }, [message, id]);

  if (!message) return null;
  return (
    <p ref={ref} id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}
