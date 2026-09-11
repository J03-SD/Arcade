import type { GameMode } from "@/lib/modes";

function CrosswordMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="3" width="6" height="6" fill="currentColor" />
      <rect x="15" y="15" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function SearchMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15.2 15.2 20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="2.2" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function GameMark({ mode, className }: { mode: GameMode; className?: string }) {
  if (mode === "search") return <SearchMark className={className} />;
  return <CrosswordMark className={className} />;
}
