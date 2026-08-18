-- every attempt recorded before this column existed was against english content
UPDATE "lesson_attempts" SET "lang" = 'en' WHERE "lang" IS NULL;
