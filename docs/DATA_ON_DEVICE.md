# What the app keeps on the TV

Wonder Window has no backend of its own, no accounts and no first-party analytics. Everything listed below is data the app itself stores. It stays on the TV, in the app's private storage, and the app never uploads it.

**Network use is not zero.** WATCH plays curated videos through the YouTube IFrame player, which the app loads from Google/YouTube hosts (`www.youtube.com/iframe_api`, `www.youtube-nocookie.com`). Google/YouTube receives those playback requests, including the video ID, and may receive network, device, request and player-interaction information under its own terms and privacy policy. What Wonder Window controls is what it puts in the requests it builds: it does not add the child's name, age, birth date, address, phone number or any of the stored app history below. PLAY and TRY work offline. See [`docs/compliance/youtube.md`](compliance/youtube.md) for the player configuration and the made-for-kids notes.

| Kept on the TV | Why | How long |
| --- | --- | --- |
| Minutes used today, the cooldown end time | One shared daily screen-time limit across WATCH, PLAY and TRY | Reset at midnight |
| IDs and start times of videos that actually started playing | Avoid showing the same video again within 7 days (D8). A video that fails before it plays is not recorded | Entries older than 14 days are deleted from storage |
| PLAY level per game and recently shown round IDs | Keep games at a fitting difficulty and avoid repeats | Until the app's data is cleared |
| TRY recently opened activity IDs (last 10) | Rotate suggestions | Until the app's data is cleared |

Not kept: watch progress or completion, likes or dislikes, inferred interests, voice, photos, location, and no address or phone number. Version 0.9 and earlier kept a behavioural ranking; the app deletes it on first start (D8).

There is no in-app reset today. D8 plans a parent-authenticated reset of this history with the parent gate (issue #6). Until then, Android's system-level action (Settings → Apps → Wonder Window → Clear data) is the only way to clear it, and it removes all of the app's state at once: screen-time minutes, game levels and TRY history as well as the video history.
