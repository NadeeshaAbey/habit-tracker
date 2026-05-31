# Privacy Policy — Habit Tracker

**Last updated: 2026-05-31**

## Overview

Habit Tracker is a fully offline app. All data you create stays on your device. We collect nothing.

---

## Data We Collect

**None.** The app has no user accounts, no analytics SDK, no telemetry, and no server of any kind. We do not know you exist.

---

## Data Stored on Your Device

The app stores the following **locally** in a SQLite database (`habits.db`) inside the app's private sandbox:

| Data | Purpose |
|---|---|
| Habit names, icons, categories | Your habit configuration |
| Daily completion logs | Tracking your progress |
| Streak freeze records | Streak-freeze feature |
| App settings (theme, accent, card style, reminder time) | Persisting your preferences |

This data never leaves your device unless **you explicitly export it** using the "Export data" feature (Settings → About → Export data), which writes a JSON file that you then choose to share via the system share sheet.

---

## Notifications

Reminders are **scheduled locally** on your device using the OS notification system. No push notification tokens are created, registered, or sent to any server. Notifications are processed entirely offline.

---

## Third-Party Services

None. The app contains no third-party analytics, advertising, crash-reporting, or tracking SDKs.

---

## Data Backup

- **iOS:** The database is stored in the app's `Library/LocalDatabase/` directory, which Apple includes in iCloud and iTunes backups by default. This means your habits are restored automatically when you reinstall on the same Apple ID.
- **Android:** Android Auto Backup may back up the database to your Google Drive account (under your app's private storage allocation). This is handled entirely by the Android OS and your Google account — we receive no copy.

---

## Your Rights & Data Deletion

You can permanently delete all app data at any time:

1. **In-app:** Settings → About → **Reset all data** — wipes habits, logs, and settings immediately.
2. **OS-level:** Uninstalling the app removes all local data.

---

## Children

The app does not knowingly collect any information from anyone, including children.

---

## Changes

If this policy ever changes (e.g., if a future version adds optional cloud sync), the updated policy will be linked from the app and the "Last updated" date above will change.

---

## Contact

If you have any questions about this policy, open an issue at:
**https://github.com/NadeeshaAbey/habit-tracker/issues**
