/*
  Warnings:

  - You are about to drop the column `dob` on the `Caregiver` table. All the data in the column will be lost.
  - You are about to drop the column `isLiveIn` on the `Caregiver` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Caregiver] ALTER COLUMN [idCardNumber] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Caregiver] DROP COLUMN [dob],
[isLiveIn];
ALTER TABLE [dbo].[Caregiver] ADD CONSTRAINT [Caregiver_gender_df] DEFAULT '女' FOR [gender];
ALTER TABLE [dbo].[Caregiver] ADD [birthDate] DATETIME2,
[certificates] NVARCHAR(max),
[jobTypes] NVARCHAR(max),
[liveInStatus] NVARCHAR(1000),
[salaryRequirements] INT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
