import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, children, className = "" }: FormFieldProps) {
  return (
    <label className={`block text-sm text-neutral-600 ${className}`}>
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
