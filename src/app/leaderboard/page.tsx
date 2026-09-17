import { Header } from "@/components/Header";
import { LeaderboardView } from "@/components/LeaderboardView";
import { PageFade } from "@/components/PageFade";
import { dayIndex } from "@/lib/daily";

export default function LeaderboardPage() {
  const today = dayIndex();
  return (
    <div className="horizon-bg flex min-h-dvh flex-col">
      <Header dayIndex={today} />
      <PageFade className="flex flex-1 flex-col">
        <LeaderboardView />
      </PageFade>
    </div>
  );
}
