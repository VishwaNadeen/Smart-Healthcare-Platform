type IconProps = {
  className?: string;
};

const baseClassName = "h-[18px] w-[18px]";

function getIconClassName(className?: string) {
  return className ? `${baseClassName} ${className}` : baseClassName;
}

export function MicIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <rect x="9" y="2.75" width="6" height="11" rx="3" />
      <path d="M5.75 10.75a6.25 6.25 0 0 0 12.5 0" />
      <path d="M12 17.75V21.25" />
      <path d="M8.75 21.25h6.5" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
      <path d="m15.5 10 4.75-3v10l-4.75-3" />
    </svg>
  );
}

export function ParticipantsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <path d="M14.5 20v-1a4.5 4.5 0 0 0-4.5-4.5H6a4.5 4.5 0 0 0-4.5 4.5v1" />
      <circle cx="8" cy="8" r="3.25" />
      <path d="M23 20v-.75a4.2 4.2 0 0 0-3.7-4.18" />
      <path d="M16.75 4.9a3.2 3.2 0 0 1 0 6.2" />
    </svg>
  );
}

export function InviteIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.75 19.5a5.25 5.25 0 0 1 10.5 0" />
      <path d="M18 8.5v6" />
      <path d="M15 11.5h6" />
    </svg>
  );
}

export function ShareScreenIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="11.5" rx="2.25" />
      <path d="M12 19.75V12.5" />
      <path d="m8.75 15.75 3.25-3.25 3.25 3.25" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2.8" />
      <path d="m19.14 12.94.02-.94-.02-.94 2.02-1.57a.66.66 0 0 0 .16-.84l-1.91-3.3a.67.67 0 0 0-.81-.29l-2.38.96a7.53 7.53 0 0 0-1.63-.94l-.36-2.53a.66.66 0 0 0-.66-.55h-3.82a.66.66 0 0 0-.66.55l-.36 2.53a7.53 7.53 0 0 0-1.63.94l-2.38-.96a.67.67 0 0 0-.81.29L2.68 8.65a.66.66 0 0 0 .16.84l2.02 1.57-.02.94.02.94-2.02 1.57a.66.66 0 0 0-.16.84l1.91 3.3a.67.67 0 0 0 .81.29l2.38-.96c.5.39 1.05.7 1.63.94l.36 2.53c.05.32.33.55.66.55h3.82c.33 0 .61-.23.66-.55l.36-2.53c.58-.24 1.13-.55 1.63-.94l2.38.96a.67.67 0 0 0 .81-.29l1.91-3.3a.66.66 0 0 0-.16-.84l-2.02-1.57Z" />
    </svg>
  );
}

export function HangupIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <path d="M4.5 15.75c4.4-4 10.6-4 15 0" />
      <path d="m6.6 13.9-2.45 2.45a.9.9 0 0 0 0 1.27l2.23 2.23a.9.9 0 0 0 1.27 0l2.45-2.45" />
      <path d="m17.4 13.9 2.45 2.45a.9.9 0 0 1 0 1.27l-2.23 2.23a.9.9 0 0 1-1.27 0l-2.45-2.45" />
    </svg>
  );
}

export function HideMeetingIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="11.5" rx="2.25" />
      <path d="m7.75 8.25 8.5 4.5" />
      <path d="m16.25 8.25-8.5 4.5" />
      <path d="M9 20h6" />
      <path d="M12 16v4" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      aria-hidden="true"
    >
      <path d="m5 12 4.2 4.2L19 6.8" />
    </svg>
  );
}
