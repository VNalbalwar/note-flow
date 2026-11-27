"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/app/actions/docs";
import { toast } from "@/components/ui/Toasts";
import type { TemplateId } from "@/lib/templates";

export function useCreatePage() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const create = async (template?: TemplateId) => {
    if (creating) return;
    setCreating(template ?? "blank");
    const result = await createDocument({ template });
    if (result.ok) router.push(`/app/d/${result.id}`);
    else toast.error(result.error);
    setCreating(null);
  };

  return { create, creating };
}
