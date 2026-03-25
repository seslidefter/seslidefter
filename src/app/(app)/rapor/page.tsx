"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RaporPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profil#rapor");
  }, [router]);
  return null;
}
