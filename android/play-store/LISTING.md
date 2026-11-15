# Google Play listing — copy and form answers

Everything here is ready to paste into Play Console. Images are in this folder.

## Store listing

**App name** (30 characters max)
```
Exportium
```

**Short description** (80 characters max)
```
Read your WhatsApp, Telegram, Instagram and Snapchat chat exports offline.
```

**Full description** (4000 characters max)
```
Your exported chats, beautifully reimagined.

Exportium turns the chat exports you download from WhatsApp, Telegram, Instagram and Snapchat into a smooth, searchable, familiar chat view — entirely on your phone. Nothing is uploaded, ever.

PRIVATE BY DESIGN
• Works completely offline. The app has no internet permission at all.
• No account, no ads, no analytics, no tracking.
• Your files stay where they are. Exportium reads them in place.

BUILT FOR HUGE CHATS
• Opens exports with hundreds of thousands of messages and multi-gigabyte media without slowing down.
• A timeline scrubber lets you fly to any point in a conversation.
• Photos and videos load on demand, so big archives don't fill your memory.

FIND ANYTHING
• Search a chat, then browse every match with Previous / Next, or pick from the list of results.
• Search across all your chats at once.
• Jump to any date from the calendar.

MORE THAN A VIEWER
• Library: star the messages you want to keep, see what happened on this day in earlier years, and list every link and file in a chat.
• Insights: who wrote the most, your busiest days, activity by hour and weekday.
• Media tab: browse every photo and video in a chat in one grid.
• Themes, wallpapers and custom avatars for each chat.

PICK UP WHERE YOU LEFT OFF
• Recent exports reopen with one tap.
• Exportium remembers where you stopped reading in every chat.

SUPPORTED EXPORTS
• WhatsApp: "Export chat" (.txt or .zip, with or without media)
• Telegram: Telegram Desktop export (.zip or result.json)
• Instagram: "Download your information" (.zip)
• Snapchat: "My Data" (.zip)

Exportium is an independent app and is not affiliated with, endorsed by or sponsored by WhatsApp, Meta, Instagram, Telegram or Snap Inc. All product names are trademarks of their owners and are used only to describe the file formats the app can read.
```

**App category:** Tools (alternative: Productivity)
**Tags:** chat backup viewer, offline, privacy
**Contact email:** your developer email (shown publicly)
**Privacy policy URL:** publish `PRIVACY_POLICY.md` and paste the public link (see RELEASING.md)

## Graphics

| Asset | File | Requirement |
|---|---|---|
| App icon | `icon-512.png` | 512 × 512 PNG |
| Feature graphic | `feature-graphic.png` | 1024 × 500 |
| Phone screenshots | `screenshots/*.png` | 2 to 8, 9:16 style, 1080 × 2160 |

## App content forms

### Data safety
- **Does your app collect or share any of the required user data types?** No
- **Is all of the user data collected by your app encrypted in transit?** Not applicable (no data is collected or transmitted)
- **Do you provide a way for users to request that their data is deleted?** Not applicable
- The form will end with "No data collected" and "No data shared". This is accurate: the app declares no internet permission.

### Content rating (IARC questionnaire)
- Category: **Utility, Productivity, Communication or other** (it is a viewer, not a social network)
- Violence, sexual content, language, controlled substances, gambling: **No** to all
- Does the app let users interact or exchange content with other users? **No** (the app shows the user's own local files and shares nothing)
- Does it share the user's location or allow purchases? **No**
- Expected result: **Everyone / PEGI 3** (the final rating is assigned by the questionnaire)

### Target audience and content
- Target age group: **18 and over** (chat exports can contain anything the user's contacts wrote). Choosing 18+ keeps the app out of the Families programme and avoids extra child-safety rules.
- Does the app appeal to children? **No**

### Other declarations
- **Ads:** No ads
- **Government app:** No
- **Financial features, health features:** None
- **News app:** No
- **COVID-19 / contact tracing:** No
- **App access:** All features available without login or special instructions
- **Permissions:** none requested, so no permission declaration form is needed
- **Photo and video permissions:** not requested

## Notes for the reviewer (optional "App access" field)
```
Exportium is fully offline and needs no login. To try it, tap an app on the Home screen (for example WhatsApp), tap "Select Chat File", and choose a chat export from the phone's storage. Sample exports can be created by any user from WhatsApp ("Export chat"), Telegram Desktop, Instagram or Snapchat.
```
