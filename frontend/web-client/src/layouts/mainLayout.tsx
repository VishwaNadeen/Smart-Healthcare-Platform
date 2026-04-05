import type { ReactNode } from "react";
import Navbar from "../components/common/navbar";
import Footer from "../components/common/footer";
import PageTransition from "../components/common/PageTransition";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="grow overflow-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}