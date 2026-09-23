-- Active games keep one short-lived state document; completed games retain outcome/XP only.
ALTER TABLE "BattleMatch" ADD COLUMN "runtime" JSONB;
