"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useStore } from "@/data/store";
import { homeForRole } from "@/lib/permissions";

/** Entry point: send the user to their home screen, or to login. */
export default function IndexPage() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.session);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(session ? homeForRole(session.role) : "/login");
  }, [hydrated, session, router]);

  return (
    <div className="p-6">
      <PageSkeleton />
    </div>
  );
}
