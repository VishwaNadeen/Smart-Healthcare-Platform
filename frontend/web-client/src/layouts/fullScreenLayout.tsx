import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function FullScreenLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}