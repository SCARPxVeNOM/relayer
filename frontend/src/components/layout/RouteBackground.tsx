"use client";

import { usePathname } from "next/navigation";

function pickBackground(pathname: string): string {
  const route = String(pathname || "").toLowerCase();
  if (route.startsWith("/protocol")) return "/image5.webp";
  if (route.startsWith("/mission")) return "/IMAGE4.jpg";
  return "/image1.png";
}

export function RouteBackground() {
  const pathname = usePathname();
  const backgroundImage = pickBackground(pathname);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url("${backgroundImage}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-[#05060a]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,77,0,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(0,255,255,0.12),transparent_40%)]" />
    </div>
  );
}
