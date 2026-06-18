/*
  Warnings:

  - You are about to drop the column `rescheduled_to_id` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "rescheduled_to_id";
