import type { Metadata } from "next";
import { ViewerProvider } from "@/context/ViewerContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Extractor Viewer",
  description: "Visualize API Extractor JSON output",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-gray-100">
        <ViewerProvider>{children}</ViewerProvider>
      </body>
    </html>
  );
}
