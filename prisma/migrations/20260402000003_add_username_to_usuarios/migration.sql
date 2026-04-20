-- AlterTable usuarios: add username and mustChangePassword
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex unique on username (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_username_key" ON "usuarios"("username");
