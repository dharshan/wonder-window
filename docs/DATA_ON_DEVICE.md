# What the app keeps on the TV

Everything stays on the TV, in the app's private storage. Nothing is sent anywhere, and the app has no analytics.

| Kept | Why | How long |
| --- | --- | --- |
| Minutes used today, the cooldown end time | One shared daily screen-time limit across WATCH, PLAY and TRY | Reset at midnight |
| IDs and start times of videos started | Avoid showing the same video again within 7 days (D8) | Purged after 14 days |
| PLAY level per game and recently shown round IDs | Keep games at a fitting difficulty and avoid repeats | Until the app's data is cleared |
| TRY recently opened activity IDs (last 10) | Rotate suggestions | Until the app's data is cleared |

Not kept: watch progress or completion, likes or dislikes, inferred interests, voice, photos, location, and no address or phone number. Version 0.9 and earlier kept a behavioural ranking; the app deletes it on first start (D8).

To clear everything today: Android Settings → Apps → Wonder Window → Clear data. A parent-authenticated reset inside the app will come with the parent gate (issue #6).
