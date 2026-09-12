# TimeEdit → Google Calendar sync
<img width="1144" height="841" alt="image" src="https://github.com/user-attachments/assets/dd1e3fa3-cbf4-47ac-a94c-ab9a73be6267" />

Tired of constantly logging into TimeEdit, or the sync with your Google Calendar
not having enough features? This is your fix!

The program is configured to Creative Technology. 
You'll need to edit the code for different studies.

It works in a simple Google Apps Script that turns the TimeEdit timetable into
real events in a Google Calendar you own.

Subscribing TimeEdit to Google Calendar the normal way gives you a read-only
feed: every event one colour, nothing removable. This creates real events
instead, which means:

- lectures, tutorials, practicals, exams and the rest each get their own colour,
  from any hex value you like
- you can delete events you do not attend, and they stay deleted
- you can rename, recolour or move an event and the sync leaves that field alone
  from then on, while still syncing everything else
- exams get reminders; ordinary classes do not
- you get an email when a room or time actually changes

It runs on Google's servers on a timer. Your laptop does not need to be on.
Completely autonomous, after you've set it up.

---

## Setup

About fifteen minutes, once. Do steps 1–4, then run `setup()`, it does the rest.

### 1. Create the project

Go to [script.google.com](https://script.google.com), sign in with the Google
account whose calendar you want this in, and click **New project**. Delete
everything in `Code.gs` and paste the whole code file in its place. Rename the
project so you can find it again.

### 2. Set the timezone

Gear icon (Project Settings) → timezone → `Europe/Amsterdam`. Brussels is the
same zone if Amsterdam is awkward to find. Do not leave it on a UK or US zone.

### 3. Enable the Calendar API

In the left sidebar click **Services +**, choose **Calendar API**, leave the
identifier as `Calendar`, click **Add**.

Custom colours do not work without this, the built-in calendar service only
knows Google's eleven presets.

### 4. Get your timetable link

Open [cloud.timeedit.net/nl_utwente/web](https://cloud.timeedit.net/nl_utwente/web)
and log in. Then:

- Search for your **Study programme**, not individual courses.
- Select all four quartiles.
- Click the date range at the top and set it to the full academic year.
  (First day of the academic year to the last, or later, I'd suggest august 1st)
- Click **Subscribe** and copy the URL it gives you.

Paste it into `ICS_URL` near the top of the script.

> **IF YOU DON'T WANT TO BE STALKED** Don't share the link, people will know where
> you are every hour of the year.

### 5. Run `setup()`

Ctrl+S, pick `setup` from the function dropdown, click **Run**.

Google will warn that the app is not verified, that is because you are the
unverified developer of a script you just pasted in yourself. Check that the
email shown is yours, then **Advanced** → **Go to … (unsafe)** → **Allow**.
If the email shown is **not** yours, stop.

`setup()` then creates a calendar called "Uni", installs the colours, runs a
first sync, and turns on the timer. Read what it prints: if any activity type
has no colour it lists them, and you can add rules later.

Already have a calendar you want to use? Put its id in `CALENDAR_ID` first —
Google Calendar → that calendar's settings → **Integrate calendar** →
Calendar ID. Otherwise leave `CALENDAR_ID` empty.

### 6. Look at your calendar

Open Google Calendar and **hard refresh** (Ctrl+Shift+R, or Cmd+Shift+R on a
Mac). The calendar was created while the page was already open, so it will not
appear until the page refetches. An empty calendar before that refresh is
normal, not a sign that something failed.

If something still looks wrong, run `verify()`, it checks the script's memory
against your calendar and the feed and reports any drift. All four of its counts
should be 0 on a fresh install.

### 7. Run `saveConfig()`

Once you are happy with your settings, run `saveConfig()` once. It copies them
into the project's script properties, which pasting a new version of the file
does not touch. Without it, upgrading means re-doing your edits by hand.

### Optional

`syncNow()` only ever touches today onwards. If you set this up mid-term and
want the weeks you already missed, run `syncPast()` once.

Nervous about letting it write? Set `DRY_RUN` to `true` and run `syncNow()`:
it logs everything it would do and changes nothing.

---

## Your settings survive a version upgrade

The constants in the file are **defaults**. Anything stored by `saveConfig()`
wins over them, and lives in script properties rather than in the code, so
replacing `Code.gs` keeps it.

`setup()` stores your `ICS_URL` and calendar id on its own, before you run
anything else. Those two always survive. Everything else survives only once you
have run `saveConfig()`.

> After `saveConfig()`, the stored value is the one in use and editing the
> constant in the file does nothing until you run `saveConfig()` again.
> **So after any change you make, run `saveConfig()`.**

`showConfig()` prints what is stored and flags every place it disagrees with the
code, which is the fastest way to catch a change that did not take.

### Upgrading

1. Paste the new file over `Code.gs`.
2. Run `showConfig()`. It lists anything the new version added that you are not
   storing yet.
3. Run `saveConfig()` if you want those stored too.
4. Run `installTrigger()` if `SYNC_TIMES` changed.

`resetConfig()` drops the stored settings and goes back to the constants in the
file. It keeps your timetable link and calendar, since losing those means
re-doing setup.

---

## Configuration

The constants near the top of `Code.gs` are the defaults. See above for how
storing them works.

### You must set this

| Setting | What it does |
| --- | --- |
| `ICS_URL` | Your TimeEdit subscribe link (step 4) |

### Optional, but set before the first run

| Setting | What it does |
| --- | --- |
| `CALENDAR_ID` | Leave empty and `setup()` makes a calendar for you |
| `NEW_CALENDAR_NAME` | What that calendar gets called |

### Colours, reminders and categories

| Setting | What it does |
| --- | --- |
| `COLORS` | The colour of each category, keyed by name. Any hex value works, not just Google's eleven presets. This is the one most people change |
| `REMINDERS` | Popup reminders per category, in minutes before the event. Anything not listed gets none |
| `RULES` | One line per activity type: a name, a pattern matching what TimeEdit calls it, and a unique id. Colour and reminders come from the two tables above |
| `DEFAULT_RULE_NAME` / `DEFAULT_RULE_ID` | The catch-all for unmatched events. Grey is a deliberate "something new appeared" signal |
| `EXTRA_RULES` | TimeEdit dumps a lot under the type "Other" and hides the real category in the description's `Extra Info:` line. These read that line |
| `TITLE_RULES` | Last resort for "Other" events with no Extra Info: match the course title instead |
| `URGENT_RULES` | Which categories make the change email shout |
| `SKIP_CATEGORIES` | Category names to never create at all, e.g. `['Self-study', 'Holiday']` |
| `SKIP_TYPES` | Raw patterns, for anything a category name cannot express. Most people do not need this |

**Changing a colour.** Edit `COLORS`, run `saveConfig()`, then run
`restyleAll()` until it reports 0 remaining.

**Adding a category.** Add a line to `RULES` with a **new** id — generate one at
[uuidgenerator.net](https://www.uuidgenerator.net) — and a matching entry in
`COLORS`. Then `saveConfig()` and `restyleAll()`.

Two things matter here:

- **Order matters.** The first match wins in `RULES`, which is why `Exam review`
  sits above `Exam`.
- **Never edit or reuse an existing id.** It is what links your events to their
  colour.

### Titles

| Setting | What it does |
| --- | --- |
| `DROP_PREFIXES` | Umbrella module names to strip, so "Smart Technology Core – Systems & Signals" becomes "Systems & Signals" |

Entries must match the text exactly. Run `debugTitles()` to see what TimeEdit is
actually publishing.

### Email

All four are independent; set any to `false` to silence it.

| Setting | Sends when |
| --- | --- |
| `EMAIL.changes` | A room or time changed, or a class was cancelled |
| `EMAIL.failures` | The sync refused to run or could not reach TimeEdit |
| `EMAIL.newTypes` | TimeEdit introduced a category you have no rule for, so events are showing up grey |
| `EMAIL.monthly` | A note on the 1st confirming it is still alive |
| `NOTIFY_EMAIL` | Leave `''` to use the account running the script |

Turning off `EMAIL.failures` is a bad idea — it is the only way you find out the
sync has stopped.

### Reminders

| Setting | What it does |
| --- | --- |
| `REMINDER_PROFILE` | `'rules'` (per-category, the default), `'none'`, `'exams-only'`, or `'everything'`. Overrides the `REMINDERS` table |

### Schedule

| Setting | What it does |
| --- | --- |
| `SYNC_TIMES` | When it runs, as `[hour, minute]`. Hours are reliable; minutes land within about 15 minutes. Run `saveConfig()` and then `installTrigger()` after changing this |
| `DAYS_AHEAD` | How far into the future to sync |
| `PAST_SYNC_DAYS` | How far back `syncPast()` reaches |

### Behaviour

| Setting | What it does |
| --- | --- |
| `ALL_DAY_IF_FULL_DAY` | Render whole-day events (holidays) as all-day bars instead of blocking the day column |
| `RESTYLE_OVERRIDES_PINS` | Whether `restyleAll()` may overwrite a colour you set by hand |
| `TOMBSTONE_TTL_DAYS` | How long a deletion is remembered |
| `MIN_FEED_RATIO` | Refuse to sync if the feed suddenly shrinks by more than this, rather than mass-deleting |
| `MAX_WRITES_PER_RUN` | Stop cleanly before Google's 6-minute limit; the next run continues where this one stopped |
| `API_RETRIES` | Attempts per Calendar call before giving up |
| `DRY_RUN` | Log every change without making any. Set it back to `false` or the sync silently stops working |

### Version

These two are deliberately not stored, so an old copy can still learn that it is
old.

| Setting | What it does |
| --- | --- |
| `SCRIPT_VERSION` | Which version you are running |
| `VERSION_URL` | A raw file containing the latest version number. The monthly email tells you when yours is old. Leave `''` to never check |

---

## Functions you can run

### First

| Function | |
| --- | --- |
| `setup` | The whole install in one run. Safe to re-run |

### Settings

| Function | |
| --- | --- |
| `saveConfig` | Store your current settings so a version upgrade cannot lose them. Run this after any change |
| `showConfig` | What is stored, and where it differs from the constants in the file |
| `resetConfig` | Drop the stored settings and go back to the code. Keeps your timetable link and calendar |

### Everyday

| Function | |
| --- | --- |
| `syncNow` | The sync. Runs on the timer; run it by hand to apply a config change immediately |
| `restyleAll` | Repaint events after changing colours or reminders. Run until it reports 0 remaining |
| `installTrigger` | (Re)build the schedule from `SYNC_TIMES` |

### When something looks wrong

| Function | |
| --- | --- |
| `verify` | Start here. Cross-checks the script's memory, your calendar and the feed against each other and reports any drift. Writes nothing |
| `listActivityTypes` | Every activity type in your feed, with counts |
| `debugTitles` | How each title gets shortened |
| `inspectType` | The actual events behind one activity type, and which rule each resolves to. Set `INSPECT_TYPE` |
| `findOrphans` | Calendar events the script does not track |
| `removeDuplicates` | Delete exact duplicates. Set `DUPLICATES_DRY_RUN` to `true` first to see what it would remove |

### Occasional

| Function | |
| --- | --- |
| `syncPast` | Add past events. Additive only, never deletes |
| `restoreDeleted` | Bring back events you deleted, then re-sync |
| `forceSync` | Sync even if the feed shrank (skips the guard) |
| `restoreStateFromBackup` | Recover from the backup copy in Drive |
| `resetSync` | Forget the sync memory. Deletions come back, your per-field edits stop being protected. Your settings and calendar are kept |

---

## How it behaves, in short

- Nothing before today is ever created, changed or deleted by `syncNow`.
- Events you made yourself are invisible to it.
- Delete a synced event and it stays deleted.
- Edit one field of an event and only that field stops syncing.
- Its memory lives in a Drive file, with a backup copy beside it.
- Its settings live in script properties, so pasting a new version keeps them.

---

## Troubleshooting

**My change did nothing.** You have run `saveConfig()` at some point, so the
stored value is winning over the constant you just edited. Run `showConfig()` to
confirm, then `saveConfig()` again to store the new value.

**My calendar is empty / the "Uni" calendar isn't there.** Hard refresh Google
Calendar (Ctrl+Shift+R). The web client caches the calendar list, so one created
by the script mid-session does not appear until the page refetches. Check the
Apps Script execution log first — if `setup()` reported creating events, they
exist and this is just the stale page.

**Everything is grey.** No rule matched the activity type. Run
`listActivityTypes()` to see what TimeEdit is publishing, add lines to `RULES`
and `COLORS`, then run `saveConfig()` and `restyleAll()`.

**Colours do nothing.** The Calendar API service is not enabled (step 3). The
built-in calendar service only knows Google's eleven presets.

**"Could not read your TimeEdit feed (HTTP 410)."** The subscribe link expired.
TimeEdit rejects one once its date range is fully in the past — regenerate it
with the range set to the current academic year. Paste the new one into
`ICS_URL` and run `saveConfig()`.

**Nothing is updating.** Check `DRY_RUN` is `false`, and that `showConfig()`
does not report a stored `dryRun` of `true`. Then run `verify()`.

**The sync stopped and I heard nothing.** Check `EMAIL.failures` is `true`, and
that `monthlyReport` still has a trigger — run `installTrigger()` to rebuild.

**Syncs run at the wrong times.** Changing `SYNC_TIMES` does not move the
triggers by itself. Run `saveConfig()`, then `installTrigger()`.
