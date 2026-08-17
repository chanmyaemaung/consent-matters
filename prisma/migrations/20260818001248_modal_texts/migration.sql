-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("acceptBgColor", "acceptLabel", "acceptTextColor", "autoMatchTheme", "bannerEnabled", "bannerText", "bgColor", "countries", "createdAt", "declineLabel", "id", "onboardingDismissed", "policyLink", "position", "prefsLabel", "reopenLabel", "shop", "showReopen", "targetingMode", "textColor", "updatedAt") SELECT "acceptBgColor", "acceptLabel", "acceptTextColor", "autoMatchTheme", "bannerEnabled", "bannerText", "bgColor", "countries", "createdAt", "declineLabel", "id", "onboardingDismissed", "policyLink", "position", "prefsLabel", "reopenLabel", "shop", "showReopen", "targetingMode", "textColor", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

