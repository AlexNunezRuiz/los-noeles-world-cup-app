import { cn } from "@/lib/utils";

interface PodiumPlayer {
  name: string;
  points: number;
  movement: number;
  isYou: boolean;
}

const STEP = {
  1: { h: "h-28", bg: "bg-gradient-to-b from-[#F4E4B8] to-[#E7C878]", av: "bg-gold", medal: "🥇" },
  2: { h: "h-[88px]", bg: "bg-gradient-to-b from-[#EAE6D9] to-[#D7D1BF]", av: "bg-[#9b958a]", medal: "🥈" },
  3: { h: "h-[76px]", bg: "bg-gradient-to-b from-[#EAD9C2] to-[#D8BF9C]", av: "bg-[#b07d3e]", medal: "🥉" },
} as const;

function Step({ player, rank }: { player: PodiumPlayer; rank: 1 | 2 | 3 }) {
  const s = STEP[rank];
  const initial = player.name.slice(0, 2);
  return (
    <div className="flex flex-1 flex-col items-center">
      <div
        className={cn(
          "relative z-10 mb-1 flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-surface font-marcador font-bold text-cream shadow-sm",
          s.av
        )}
      >
        {initial}
      </div>
      <div
        className={cn(
          "flex w-full flex-col items-center justify-end rounded-t-xl pb-2 pt-2",
          s.h,
          s.bg,
          player.isYou && "outline outline-2 -outline-offset-2 outline-red"
        )}
      >
        <span className="mb-0.5 leading-none text-lg">{s.medal}</span>
        <span className="font-sans text-[10px] font-bold text-ink">{player.name}</span>
        <span className="font-marcador text-base font-bold text-ink">{player.points}</span>
        <span
          className={cn(
            "font-marcador text-[9px] font-bold",
            player.movement > 0 ? "text-green" : player.movement < 0 ? "text-red" : "text-ink-faint"
          )}
        >
          {player.movement > 0 ? `▲${player.movement}` : player.movement < 0 ? `▼${-player.movement}` : "="}
        </span>
      </div>
    </div>
  );
}

export function Podium({ players }: { players: PodiumPlayer[] }) {
  return (
    <div className="flex items-end gap-2">
      {players[1] && <Step player={players[1]} rank={2} />}
      {players[0] && <Step player={players[0]} rank={1} />}
      {players[2] && <Step player={players[2]} rank={3} />}
    </div>
  );
}
