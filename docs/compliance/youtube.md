# WATCH and YouTube: how the project stays within the terms

Status: working policy for the prototype; not legal advice. Re-check the YouTube API Services Terms and Developer Policies before each release.

- **No keys in the repository.** The project ships no API keys. A family that wants richer data uses its own Google Cloud project and key, configured locally.
- **What is committed:** channel and video IDs plus our own editorial text (row names, notes, review state). `catalog/channels_v2.json` holds only that.
- **What is never committed:** titles, thumbnails, durations or any other API Data. `catalog/catalog.json` (fetched locally from public RSS feeds) is git-ignored; refresh it at least every 30 days.
- **Player:** the official IFrame player with documented parameters only. Ads are never blocked or skipped. Links out of the player go to a grown-up, never silently blocked.
- **No scraping.** No yt-dlp or similar tools; no transcripts or caption text are stored.
- **Made for Kids:** before a public release, look up each video's Made-for-Kids status with the family's own key and hide unknowns.
- **Open question:** whether a public "bring your own key" kids' client and a public ID list are acceptable to YouTube. Ask YouTube API support in writing before 1.0 and record the answer here.
