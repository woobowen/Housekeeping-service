BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Caregiver] (
    [idString] NVARCHAR(1000) NOT NULL,
    [workerId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [idCardNumber] NVARCHAR(1000) NOT NULL,
    [dob] DATETIME2,
    [gender] NVARCHAR(1000),
    [nativePlace] NVARCHAR(1000),
    [education] NVARCHAR(1000),
    [workExpLevel] NVARCHAR(1000),
    [isLiveIn] NVARCHAR(1000),
    [specialties] NVARCHAR(max),
    [cookingSkills] NVARCHAR(max),
    [languages] NVARCHAR(max),
    [avatarUrl] NVARCHAR(1000),
    [idCardFrontUrl] NVARCHAR(1000),
    [idCardBackUrl] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Caregiver_status_df] DEFAULT 'PENDING',
    [level] NVARCHAR(1000) NOT NULL CONSTRAINT [Caregiver_level_df] DEFAULT 'TRAINEE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Caregiver_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Caregiver_pkey] PRIMARY KEY CLUSTERED ([idString]),
    CONSTRAINT [Caregiver_workerId_key] UNIQUE NONCLUSTERED ([workerId]),
    CONSTRAINT [Caregiver_idCardNumber_key] UNIQUE NONCLUSTERED ([idCardNumber])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
