import { AppPromo } from "@/components/home/AppPromo";
import { DailyChallengesCard } from "@/components/home/DailyChallengesCard";
import { FaqSection } from "@/components/home/FaqSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HskRoadmap } from "@/components/home/HskRoadmap";
import { LeaderboardCard } from "@/components/home/LeaderboardCard";
import { PartnersCard } from "@/components/home/PartnersCard";
import { RecommendedLessons } from "@/components/home/RecommendedLessons";
import { ResourcesSection } from "@/components/home/ResourcesSection";
import { StreakCard } from "@/components/home/StreakCard";
import { VideoSection } from "@/components/home/VideoSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { prisma } from "@/lib/prisma";

async function getHomeData() {
  try {
    const [stats, partners, challenges, videos, leaderboard] = await Promise.all([
      prisma.homeStat.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.partner.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.dailyChallenge.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.homeVideo.findMany({ orderBy: { sortOrder: "asc" }, take: 4 }),
      prisma.leaderboardEntry.findMany({
        orderBy: { sortOrder: "asc" },
        take: 5,
      }),
    ]);

    return { stats, partners, challenges, videos, leaderboard };
  } catch {
    return {
      stats: [
        { key: "lessons", label: "Bài học", value: "1.253+" },
        { key: "vocab", label: "Từ vựng", value: "10.996+" },
        { key: "exams", label: "Đề thi thử", value: "450+" },
        { key: "levels", label: "Cấp độ", value: "9" },
      ],
      partners: [
        {
          id: "1",
          name: "Cô Minh Anh",
          center: "Trung tâm Anh ngữ HN",
          phone: "0901 234 567",
        },
        {
          id: "2",
          name: "Thầy Đức Long",
          center: "WEWIN Partner Academy",
          phone: "0912 345 678",
        },
      ],
      challenges: [
        { id: "1", title: "Hoàn thành 2 bài học", targetCount: 2, xpReward: 60 },
        { id: "2", title: "Ôn 10 từ vựng", targetCount: 10, xpReward: 60 },
        { id: "3", title: "Làm 1 đề thi thử", targetCount: 1, xpReward: 60 },
      ],
      videos: [
        { id: "f-THLbSEZ4Y", title: "Introduce yourself in English" },
        { id: "LG7ysbsDf30", title: "My daily routine" },
        { id: "1TjgNeLY3Os", title: "At the supermarket" },
        { id: "4lHwBZr66so", title: "Ngày đầu tiên đi học của tôi" },
      ],
      leaderboard: [
        { id: "1", name: "Trang Minh", level: 43, xp: 12500 },
        { id: "2", name: "van tran", level: 11, xp: 3200 },
        { id: "3", name: "Thư", level: 16, xp: 4100 },
        { id: "4", name: "Jessi", level: 9, xp: 2100 },
        { id: "5", name: "Kim Andrea", level: 8, xp: 1800 },
      ],
    };
  }
}

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <HomeHero />
          <div className="grid gap-4 lg:grid-cols-2">
            <VideoSection
              videos={data.videos.map((v) => {
                const youtubeId =
                  "youtubeId" in v ? (v.youtubeId as string | null) : null;
                return {
                  id: youtubeId || v.id,
                  title: v.title,
                };
              })}
            />
            <ResourcesSection stats={data.stats} />
          </div>
          <RecommendedLessons />
        </div>

        <div className="space-y-4">
          <StreakCard />
          <PartnersCard partners={data.partners} />
          <DailyChallengesCard challenges={data.challenges} />
          <LeaderboardCard entries={data.leaderboard} />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <HskRoadmap />
        <AppPromo />
        <FaqSection />
        <SiteFooter />
      </div>
    </div>
  );
}
