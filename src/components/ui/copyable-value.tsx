"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

interface CopyableValueProps {
  label: string;
  value: string;
  className?: string;
}

export function CopyableValue({ label, value, className }: CopyableValueProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const didCopy = await copyTextToClipboard(value, navigator.clipboard);

    if (!didCopy) {
      toast({
        title: "No se pudo copiar",
        description: "Selecciona el numero y copialo manualmente.",
        variant: "destructive",
      });
      return;
    }

    setCopied(true);
    toast({ title: `${label} copiado` });
    window.setTimeout(() => setCopied(false), 1600);
  };

  const Icon = copied ? Check : Copy;

  return (
    <span className={cn("inline-flex max-w-full flex-wrap items-center gap-1.5", className)}>
      <span>
        {label}: <span className="font-bold break-all">{value}</span>
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copiar ${label}`}
        title={`Copiar ${label}`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-current/25 text-current transition-colors hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
