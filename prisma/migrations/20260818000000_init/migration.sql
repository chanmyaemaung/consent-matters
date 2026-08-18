-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "targetingMode" TEXT NOT NULL DEFAULT 'auto',
    "countries" TEXT NOT NULL DEFAULT '[]',
    "autoMatchTheme" BOOLEAN NOT NULL DEFAULT true,
    "bgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#202223',
    "acceptBgColor" TEXT NOT NULL DEFAULT '#111213',
    "acceptTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "position" TEXT NOT NULL DEFAULT 'bar-bottom',
    "bannerText" TEXT NOT NULL DEFAULT 'We use cookies to improve your experience, analyze traffic, and personalize marketing. You can accept, decline, or manage your preferences.',
    "acceptLabel" TEXT NOT NULL DEFAULT 'Accept',
    "declineLabel" TEXT NOT NULL DEFAULT 'Decline',
    "prefsLabel" TEXT NOT NULL DEFAULT 'Manage preferences',
    "policyLink" TEXT,
    "showReopen" BOOLEAN NOT NULL DEFAULT true,
    "reopenLabel" TEXT NOT NULL DEFAULT 'Cookie settings',
    "modalTitle" TEXT NOT NULL DEFAULT 'Privacy preferences',
    "modalIntro" TEXT NOT NULL DEFAULT 'Choose which cookies you allow. Essential cookies are always on — the store cannot work without them.',
    "saveLabel" TEXT NOT NULL DEFAULT 'Save choices',
    "acceptAllLabel" TEXT NOT NULL DEFAULT 'Accept all',
    "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");

