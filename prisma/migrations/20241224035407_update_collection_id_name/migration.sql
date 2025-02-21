/*
  Warnings:

  - A unique constraint covering the columns `[collectionId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_collectionId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Category_collectionId_key" ON "Category"("collectionId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Category"("collectionId") ON DELETE SET NULL ON UPDATE CASCADE;
