import { useId, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

type PasswordFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  inputClassName?: string;
  wrapperClassName?: string;
};

function EyeOpenIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4 4" />
      <path d="M9.4 5.5A11 11 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5" />
      <path d="M6.7 6.7A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.3-1.4" />
    </svg>
  );
}

export default function PasswordField({
  id,
  inputClassName = "",
  wrapperClassName = "",
  ...inputProps
}: PasswordFieldProps) {
  const generatedId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const inputId = id || generatedId;

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <input
        {...inputProps}
        id={inputId}
        type={isVisible ? "text" : "password"}
        className={`${inputClassName} pr-12`.trim()}
      />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        aria-controls={inputId}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {isVisible ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </button>
    </div>
  );
}
