-- CreateTable
CREATE TABLE "Caregiver" (
    "idString" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idCardNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT DEFAULT '女',
    "nativePlace" TEXT,
    "education" TEXT,
    "currentResidence" TEXT,
    "residenceDetail" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "workExpLevel" TEXT,
    "experienceYears" INTEGER,
    "isLiveIn" TEXT,
    "isTrainee" BOOLEAN NOT NULL DEFAULT false,
    "salaryRequirements" INTEGER,
    "monthlySalary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "jobTypes" TEXT,
    "specialties" TEXT,
    "cookingSkills" TEXT,
    "languages" TEXT,
    "certificates" TEXT,
    "healthCertImages" TEXT,
    "lifeImages" TEXT,
    "workHistory" TEXT,
    "selfIntro" TEXT,
    "reviews" TEXT,
    "avatarUrl" TEXT,
    "idCardFrontUrl" TEXT,
    "idCardBackUrl" TEXT,
    "notes" TEXT,
    "customData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "level" TEXT NOT NULL DEFAULT 'TRAINEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caregiver_pkey" PRIMARY KEY ("idString")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "salaryMode" TEXT NOT NULL DEFAULT 'DAILY',
    "dailySalary" DECIMAL(10,2),
    "monthlySalary" DECIMAL(10,2),
    "durationDays" INTEGER,
    "actualWorkedDays" INTEGER,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "managementFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "clientName" TEXT,
    "dispatcherName" TEXT NOT NULL,
    "dispatcherPhone" TEXT NOT NULL,
    "clientLocation" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "remarks" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "requirements" TEXT,
    "customData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "caregiverId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverTimeline" (
    "idString" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caregiverId" TEXT NOT NULL,

    CONSTRAINT "CaregiverTimeline_pkey" PRIMARY KEY ("idString")
);

-- CreateTable
CREATE TABLE "SystemFieldDefinition" (
    "id" TEXT NOT NULL,
    "targetModel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SalarySettlement" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalarySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Caregiver_workerId_key" ON "Caregiver"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Caregiver_idCardNumber_key" ON "Caregiver"("idCardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_phone_key" ON "AdminAccount"("phone");

-- CreateIndex
CREATE INDEX "VerificationCode_email_type_createdAt_idx" ON "VerificationCode"("email", "type", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationCode_email_type_consumedAt_expiresAt_idx" ON "VerificationCode"("email", "type", "consumedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_caregiverId_status_startDate_endDate_idx" ON "Order"("caregiverId", "status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Order_startDate_endDate_idx" ON "Order"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "SystemFieldDefinition_targetModel_name_key" ON "SystemFieldDefinition"("targetModel", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SalarySettlement_caregiverId_month_key" ON "SalarySettlement"("caregiverId", "month");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("idString") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverTimeline" ADD CONSTRAINT "CaregiverTimeline_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("idString") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySettlement" ADD CONSTRAINT "SalarySettlement_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("idString") ON DELETE RESTRICT ON UPDATE CASCADE;
