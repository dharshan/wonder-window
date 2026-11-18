# What the app keeps on the TV

Wonder Window has no backend of its own, no accounts and no first-party analytics. Everything listed below stays on the TV, in the app's private storage, and the app never uploads it.

**Network use is not zero.** WATCH plays curated videos through the YouTube IFrame player, which the app loads from Google/YouTube hosts (`www.youtube.com/iframe_api`, `www.youtube-nocookie.com`). Those requests come from Google's player, not from Wonder Window, and Google's own terms and privacy policy apply to them. Wonder Window sends no child data with them: no name, age, birth date, address, phone or app history. PLAY and TRY work offline. See [`docs/compliance/youtube.md`](compliance/youtube.md) for the player configuration and the made-for-kids notes.

| Kept on the TV | Why | How long |
| --- | --- | --- |
| Minutes used today, the cooldown end time | One shared daily screen-time limit across WATCH, PLAY and TRY | Reset at midnight |
| IDs and start times of videos that actually started playing | Avoid showing the same video again within 7 days (D8). A video that fails before it plays is not recorded | Entries older than 14 days are deleted from storage |
| PLAY level per game and recently shown round IDs | Keep games at a fitting difficulty and avoid repeats | Until the app's data is cleared |
| TRY recently opened activity IDs (last 10) | Rotate suggestions | Until the app's data is cleared |

Not kept: watch progress or completion, likes or dislikes, inferred interests, voice, photos, location, and no address or phone number. Version 0.9 and earlier kept a behavioural ranking; the app deletes it on first start (D8).

To clear everything today: Android Settings → Apps → Wonder Window → Clear data. A parent-authenticated reset inside the app will come with the parent gate (issue #6).
