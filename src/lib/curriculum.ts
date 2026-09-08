import { prisma } from "@/lib/prisma";

export async function getGradeLevels() {
  return prisma.gradeLevel.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { topics: true } },
      topics: {
        select: {
          _count: { select: { lessons: true } },
        },
      },
    },
  });
}

export async function getGradeLevelBySlug(slug: string) {
  return prisma.gradeLevel.findUnique({
    where: { slug },
    include: {
      topics: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export async function getLessonBySlugs(
  levelSlug: string,
  lessonSlug: string,
) {
  return prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      topic: { gradeLevel: { slug: levelSlug } },
    },
    include: {
      topic: {
        include: { gradeLevel: true },
      },
    },
  });
}

export function lessonCountForLevel(
  level: Awaited<ReturnType<typeof getGradeLevels>>[number],
) {
  return level.topics.reduce((sum, t) => sum + t._count.lessons, 0);
}
