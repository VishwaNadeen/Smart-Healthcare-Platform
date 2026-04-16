import type { ReactNode } from "react";
import PageTransition from "../components/common/PageTransition";

type Props = {
  children: ReactNode;
};

export default function FullScreenLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <PageTransition>{children}</PageTransition>
    </div>
  );
}