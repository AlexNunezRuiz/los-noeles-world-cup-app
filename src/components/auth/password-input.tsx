"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<InputProps, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-11 w-11 text-ink-muted hover:text-ink"
        aria-label={label}
        title={label}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
