/*
  Warnings:

  - You are about to drop the column `ipHash` on the `verifications` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `verifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "verifications" DROP COLUMN "ipHash",
DROP COLUMN "userAgent";
