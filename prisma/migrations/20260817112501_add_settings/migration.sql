-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gaMeasurementId" TEXT,
    "metaPixelId" TEXT,
    "customScripts" TEXT,
    "targetingMode" TEXT NOT NULL DEFAULT 'auto',
    "countries" TEXT NOT NULL DEFAULT '[]',
    "autoMatchTheme" BOOLEAN NOT NULL DEFAULT true,
    "bgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#202223',
    "acceptBgColor" TEXT NOT NULL DEFAULT '#008060',
    "acceptTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "position" TEXT NOT NULL DEFAULT 'bottom',
    "bannerText" TEXT NOT NULL DEFAULT 'We use cookies to improve your experience, analyze site traffic, and personalize marketing. You can accept or decline non-essential cookies.',
    "acceptLabel" TEXT NOT NULL DEFAULT 'Accept',
    "declineLabel" TEXT NOT NULL DEFAULT 'Decline',
    "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
