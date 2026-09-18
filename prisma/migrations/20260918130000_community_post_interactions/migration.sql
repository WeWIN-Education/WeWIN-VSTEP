-- Add durable likes and comments for public community and editorial posts.
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userPostId" TEXT,
    "blogPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostLike_userId_userPostId_key" ON "PostLike"("userId", "userPostId");
CREATE UNIQUE INDEX "PostLike_userId_blogPostId_key" ON "PostLike"("userId", "blogPostId");
CREATE INDEX "PostLike_userPostId_createdAt_idx" ON "PostLike"("userPostId", "createdAt");
CREATE INDEX "PostLike_blogPostId_createdAt_idx" ON "PostLike"("blogPostId", "createdAt");

ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userPostId_fkey"
  FOREIGN KEY ("userPostId") REFERENCES "UserPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_blogPostId_fkey"
  FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_one_target_check"
  CHECK (("userPostId" IS NOT NULL AND "blogPostId" IS NULL)
      OR ("userPostId" IS NULL AND "blogPostId" IS NOT NULL));

CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userPostId" TEXT,
    "blogPostId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostComment_userPostId_createdAt_idx" ON "PostComment"("userPostId", "createdAt");
CREATE INDEX "PostComment_blogPostId_createdAt_idx" ON "PostComment"("blogPostId", "createdAt");

ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userPostId_fkey"
  FOREIGN KEY ("userPostId") REFERENCES "UserPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_blogPostId_fkey"
  FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_one_target_check"
  CHECK (("userPostId" IS NOT NULL AND "blogPostId" IS NULL)
      OR ("userPostId" IS NULL AND "blogPostId" IS NOT NULL));
