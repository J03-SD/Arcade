import { notFound, redirect } from "next/navigation";
import { PlayView } from "@/components/PlayView";
import { dayIndex } from "@/lib/daily";
import { MODES, isComingSoonMode, isGameMode } from "@/lib/modes";

export function generateStaticParams() {
  return MODES.map((mode) => ({ mode }));
}

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ daily?: string }>;
}) {
  const { mode } = await params;
  const query = await searchParams;
  if (!isGameMode(mode)) notFound();
  if (isComingSoonMode(mode)) redirect("/");
  const practice = query.daily === "0";
  return <PlayView mode={mode} dayIndex={dayIndex()} forcePractice={practice} />;
}
