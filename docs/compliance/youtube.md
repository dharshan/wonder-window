# WATCH and YouTube: data sources and terms

Status: working policy for the prototype, checked against the pages below on 18 Nov 2026. Not legal advice; re-check before each release.

## What the app uses today: public RSS discovery
- `pipeline/fetch_catalog.py` reads each listed channel's public RSS feed (`youtube.com/feeds/videos.xml?channel_id=…`), filters titles and writes `catalog/catalog.json` locally.
- No API key or credential is involved. RSS is not the YouTube Data API, so the Data API's credential and caching rules do not automatically describe it; the YouTube Terms of Service still apply to playback and to any automated access.
- `catalog/catalog.json` (titles, video IDs) is git-ignored and regenerated locally; the public repository commits only channel IDs and our own row text (`catalog/channels_v2.json`).
- Playback uses the official IFrame Player with documented parameters only. Ads are never blocked or skipped.

## If a family later uses the YouTube Data API
- **Credentials:** the Developer Policies say API credentials must not be embedded in open-source projects. Keys are never placed in source, assets, APKs, CI or release artifacts. Each family uses its own Google Cloud project and key, stored locally. ([Developer Policies](https://developers.google.com/youtube/terms/developer-policies/))
- **Made for Kids:** check each video's `status.madeForKids` with `videos.list` before embedding, and turn off player tracking for MFK content as the guide describes. Hide videos whose status is unknown. ([Made for Kids guide](https://developers.google.com/youtube/data/guides/made_for_kids_status))
- **API Data retention:** follow the policy limits on storing and refreshing API Data; never commit it.
- **Privacy disclosure:** document what is fetched, where it is stored (only on the family's device) and how to delete it.

## Never
- No scraping tools (no yt-dlp or similar), no transcripts or caption text stored.
- No replacement of YouTube titles with our own text; our notes are labelled as ours.

## Open question before 1.0
Ask YouTube API Services support whether a public "bring your own key" children's client and a public channel-ID list are acceptable, and record the answer here.
