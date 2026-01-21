-- AddForeignKey
ALTER TABLE "CrmCredential" ADD CONSTRAINT "CrmCredential_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
