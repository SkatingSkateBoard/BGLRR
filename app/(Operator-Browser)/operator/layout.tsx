import type { ReactNode } from "react";
import OperatorSidebar from "@/components/operatorComps/OperatorSidebar";

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return <OperatorSidebar>{children}</OperatorSidebar>;
}
