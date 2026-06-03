import { BadgeCheck, CircleAlert, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserStatus, getUserStatusLabel, type UserStatusSource } from "@/lib/users/status";

interface UserStatusIconProps extends UserStatusSource {
  className?: string;
  showLabel?: boolean;
}

export function UserStatusIcon({
  is_admin,
  has_paid,
  className,
  showLabel = false,
}: UserStatusIconProps) {
  const status = getUserStatus({ is_admin, has_paid });
  const label = getUserStatusLabel(status);
  const Icon = status === "admin" ? Crown : status === "paid" ? BadgeCheck : CircleAlert;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 align-middle font-sans text-[10px] font-bold uppercase leading-none",
        status === "admin" && "border-gold/40 bg-gold/15 text-gold",
        status === "paid" && "border-green/30 bg-green/10 text-green",
        status === "unpaid" && "border-red/25 bg-red/10 text-red",
        !showLabel && "h-5 w-5 justify-center px-0",
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
