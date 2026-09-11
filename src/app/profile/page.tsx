import { Header } from "@/components/Header";
import { PageFade } from "@/components/PageFade";
import { ProfileView } from "@/components/ProfileView";
import { dayIndex } from "@/lib/daily";

export default function ProfilePage() {
  const today = dayIndex();
  return (
    <div className="horizon-bg flex min-h-dvh flex-col">
      <Header dayIndex={today} />
      <PageFade className="flex flex-1 flex-col">
        <ProfileView />
      </PageFade>
    </div>
  );
}
