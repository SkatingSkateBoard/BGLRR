import { notFound } from "next/navigation";
import PreviewBrowser from "@/components/preview/PreviewBrowser";

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <PreviewBrowser />;
}
