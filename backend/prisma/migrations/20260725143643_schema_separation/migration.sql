-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cla";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "dbo";

-- CreateTable
CREATE TABLE "cla"."Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dbo"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "cla"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "dbo"."User"("email");

-- AddForeignKey
ALTER TABLE "dbo"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "cla"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
