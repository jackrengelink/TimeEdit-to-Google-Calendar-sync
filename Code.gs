/**
 * ============================================================================
 *  TimeEdit  ->  Google Calendar sync        University of Twente / CreaTe
 * ============================================================================
 *
 *  WHAT THIS DOES
 *
 *  Subscribing TimeEdit to Google Calendar the normal way gives you a
 *  read-only feed: every event one colour, nothing removable. This creates
 *  real events in a calendar you own instead, which means:
 *
 *    - lectures, tutorials, practicals, exams and the rest each get their own
 *      colour, from any hex value you like
 *    - you can delete events you do not attend, and they stay deleted
 *    - you can rename, recolour or move an event and the sync leaves that
 *      field alone from then on, while still syncing everything else
 *    - exams get reminders; ordinary classes do not
 *    - you get an email when a room or time actually changes
 *
 *  It runs on Google's servers on a timer. Your laptop does not need to be on.
 *
 * ----------------------------------------------------------------------------
 *  SETUP  —  about fifteen minutes, once
 * ----------------------------------------------------------------------------
 *
 *  THE SHORT VERSION: do steps 1-4, then run setup(). It does the rest.
 *
 *  1. CREATE THE PROJECT
 *     Go to script.google.com, sign in with the Google account whose calendar
 *     you want this in, and click "New project". Delete everything in Code.gs
 *     and paste this whole file in its place. Rename the project so you can
 *     find it again.
 *
 *  2. SET THE TIMEZONE
 *     Gear icon (Project Settings) -> timezone -> Europe/Amsterdam. Brussels
 *     is the same zone if Amsterdam is awkward to find. Do not leave it on a
 *     UK or US zone.
 *
 *  3. ENABLE THE CALENDAR API
 *     In the left sidebar click "Services +", choose "Calendar API", leave the
 *     identifier as "Calendar", click Add. Custom colours do not work without
 *     this — the built-in calendar service only knows Google's eleven presets.
 *
 *  4. GET YOUR TIMETABLE LINK
 *     Open cloud.timeedit.net/nl_utwente/web and log in. Search for your
 *     programme and year as a whole (not individual courses — course codes
 *     expire every quartile, a programme selection does not). Select all four
 *     quartiles. Click the date range at the top and set it to the full
 *     academic year. Then Subscribe, and copy the URL it gives you.
 *     Paste it into ICS_URL below.
 *
 *     Treat that URL as private: it needs no password, so anyone holding it
 *     can see where you are every hour of the year.
 *
 *  5. RUN setup()
 *     Ctrl+S, pick "setup" from the function dropdown, click Run.
 *
 *     Google will warn that the app is not verified — that is because you are
 *     the unverified developer of a script you just pasted in yourself. Check
 *     that the email shown is yours, then Advanced -> "Go to ... (unsafe)" ->
 *     Allow. If the email shown is NOT yours, stop.
 *
 *     setup() then creates a calendar called "Uni", installs the colours,
 *     runs a first sync, and turns on the timer. Read what it prints: if any
 *     activity type has no colour it lists them, and you can add rules later.
 *
 *     Already have a calendar you want to use? Put its id in CALENDAR_ID
 *     first — Google Calendar -> that calendar's settings -> "Integrate
 *     calendar" -> Calendar ID. Otherwise leave CALENDAR_ID empty.
 *
 *  6. LOOK AT YOUR CALENDAR
 *     That is it. If something looks wrong, run verify() — it checks the
 *     script's memory against your calendar and the feed and reports any drift.
 *
 *  OPTIONAL
 *     syncNow() only ever touches today onwards. If you set this up mid-term
 *     and want the weeks you already missed, run syncPast() once.
 *     Nervous about letting it write? Set DRY_RUN to true and run syncNow():
 *     it logs everything it would do and changes nothing.
 *
 * ----------------------------------------------------------------------------
 *  WHAT YOU CAN CHANGE
 * ----------------------------------------------------------------------------
 *
 *  YOU MUST SET THIS
 *    ICS_URL ................ your TimeEdit subscribe link (step 4)
 *
 *  OPTIONAL, BUT SET BEFORE THE FIRST RUN
 *    CALENDAR_ID ............ leave empty and setup() makes one for you
 *    NEW_CALENDAR_NAME ...... what that calendar gets called
 *
 *  COLOURS, REMINDERS AND CATEGORIES
 *    RULES .................. the heart of it. One line per activity type:
 *                             a name, a pattern matching what TimeEdit calls
 *                             it, a hex colour, a unique id, and reminders.
 *                             Order matters — the first match wins, which is
 *                             why "Exam review" sits above "Exam".
 *                             To add a type: copy a line, change the name,
 *                             pattern and colour, and give it a NEW id.
 *                             Generate one at uuidgenerator.net.
 *                             Never edit or reuse an existing id — it is what
 *                             links your events to their colour.
 *    DEFAULT_RULE ........... what unmatched events look like. Grey is a
 *                             deliberate "something new appeared" signal.
 *    EXTRA_RULES ............ TimeEdit dumps a lot under the type "Other" and
 *                             hides the real category in the description's
 *                             "Extra Info:" line. These read that line.
 *    TITLE_RULES ............ last resort for "Other" events with no Extra
 *                             Info: match the course title instead.
 *    URGENT_RULES ........... which categories make the change email shout.
 *    SKIP_TYPES ............. types to never create at all. The commented
 *                             example drops the holiday markers.
 *
 *  TITLES
 *    DROP_PREFIXES .......... umbrella module names to strip, so
 *                             "Smart Technology Core - Systems & Signals"
 *                             becomes "Systems & Signals". Must match the
 *                             text exactly; debugTitles() shows you what it is.
 *
 *  EMAIL  (all four independent — set any to false to silence it)
 *    EMAIL.changes .......... a room or time changed, or a class was cancelled
 *    EMAIL.failures ......... the sync refused to run or could not reach
 *                             TimeEdit. Turning this off is a bad idea: it is
 *                             the only way you find out it has stopped
 *    EMAIL.newTypes ......... TimeEdit introduced a category you have no rule
 *                             for, so events are showing up grey
 *    EMAIL.monthly .......... a note on the 1st confirming it is still alive
 *    NOTIFY_EMAIL ........... leave '' to use the account running the script
 *
 *  REMINDERS
 *    REMINDER_PROFILE ....... 'rules' (per-category, the default), 'none',
 *                             'exams-only', or 'everything'. Overrides the
 *                             reminders set on individual rules
 *
 *  SCHEDULE
 *    SYNC_TIMES ............. when it runs, as [hour, minute]. Hours are
 *                             reliable; minutes land within about 15 minutes.
 *                             Run installTrigger() after changing this.
 *    DAYS_AHEAD ............. how far into the future to sync
 *    PAST_SYNC_DAYS ......... how far back syncPast() reaches
 *
 *  BEHAVIOUR
 *    ALL_DAY_IF_FULL_DAY .... render whole-day events (holidays) as all-day
 *                             bars instead of blocking the day column
 *    RESTYLE_OVERRIDES_PINS . whether restyleAll() may overwrite a colour you
 *                             set by hand
 *    TOMBSTONE_TTL_DAYS ..... how long a deletion is remembered
 *    MIN_FEED_RATIO ......... refuse to sync if the feed suddenly shrinks by
 *                             more than this, rather than mass-deleting
 *    MAX_WRITES_PER_RUN ..... stop cleanly before Google's 6-minute limit;
 *                             the next run continues where this one stopped
 *    API_RETRIES ............ attempts per Calendar call before giving up
 *    DRY_RUN ................ log every change without making any. Set it back
 *                             to false or the sync silently stops working
 *
 *  VERSION
 *    SCRIPT_VERSION ......... which version you are running
 *    VERSION_URL ............ a raw file containing the latest version number.
 *                             The monthly email tells you when yours is old.
 *                             Leave '' to never check
 *
 * ----------------------------------------------------------------------------
 *  FUNCTIONS YOU CAN RUN
 * ----------------------------------------------------------------------------
 *
 *  FIRST
 *    setup .................. the whole install in one run. Safe to re-run
 *
 *  EVERYDAY
 *    syncNow ................ the sync. Runs on the timer; run it by hand to
 *                             apply a config change immediately
 *    restyleAll ............. repaint events after changing colours or
 *                             reminders. Run until it reports 0 remaining
 *    installTrigger ......... (re)build the schedule from SYNC_TIMES
 *
 *  WHEN SOMETHING LOOKS WRONG
 *    verify ................. start here. Cross-checks the script's memory,
 *                             your calendar and the feed against each other
 *                             and reports any drift. Writes nothing
 *    listActivityTypes ...... every activity type in your feed, with counts
 *    debugTitles ............ how each title gets shortened
 *    inspectType ............ the actual events behind one activity type, and
 *                             which rule each resolves to. Set INSPECT_TYPE
 *    findOrphans ............ calendar events the script does not track
 *    removeDuplicates ....... delete exact duplicates. Set DUPLICATES_DRY_RUN
 *                             to true first to see what it would remove
 *
 *  OCCASIONAL
 *    syncPast ............... add past events. Additive only, never deletes
 *    restoreDeleted ......... bring back events you deleted, then re-sync
 *    forceSync .............. sync even if the feed shrank (skips the guard)
 *    restoreStateFromBackup . recover from the backup copy in Drive
 *    resetSync .............. forget everything. Deletions come back, your
 *                             per-field edits stop being protected
 *
 * ----------------------------------------------------------------------------
 *  HOW IT BEHAVES, IN SHORT
 * ----------------------------------------------------------------------------
 *
 *  - Nothing before today is ever created, changed or deleted by syncNow.
 *  - Events you made yourself are invisible to it.
 *  - Delete a synced event and it stays deleted.
 *  - Edit one field of an event and only that field stops syncing.
 *  - Its memory lives in a Drive file, with a backup copy beside it.
 *
 * ============================================================================
 */

// ---------------------------------------------------------------- CONFIG

const ICS_URL = '';
// Leave this empty and setup() creates a calendar for you and remembers it.
// Fill it in only if you want the events in a calendar you already have.
const CALENDAR_ID = '';
const NEW_CALENDAR_NAME = 'Uni';

// Covers a full academic year. Nothing before today is ever touched.
const DAYS_AHEAD = 400;

// How far back syncPast() reaches. It is never run automatically.
const PAST_SYNC_DAYS = 400;

// Sync times as [hour, minute]. Hours are reliable, minutes land within
// roughly a 15-minute window. Change these, then run installTrigger().
const SYNC_TIMES = [
  [6, 0], [6, 50], [7, 15], [13, 0], [18, 0], [19, 0],
];

/**
 * First matching rule wins. `match` is tested against the activity type that
 * TimeEdit puts on its own line in the DESCRIPTION.
 *
 * Each rule is also a calendar label: any hex colour works, not just Google's
 * eleven presets. The name shows as a tag on the event. Change a colour here
 * and the next sync pushes the new palette; run restyleAll() to repaint
 * events that already exist.
 *
 * `id` must stay stable — it links events to their label. Never edit or reuse
 * one; add a new line with a fresh UUID instead.
 *
 * reminders: popup minutes before the event. 2880 = 2 days, 1440 = 1 day.
 */
const RULES = [
  { name: 'Exam review',  match: /^exam\s*review/i,              color: '#F28B82',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000001', reminders: [] },
  { name: 'Exam',         match: /^(exam|test|tentamen|resit)/i, color: '#D50000',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000002', reminders: [2880, 1440, 120] },
  { name: 'Lecture',      match: /^lecture/i,                    color: '#4285F4',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000003', reminders: [] },
  { name: 'Tutorial',     match: /^tutorial/i,                   color: '#33B679',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000004', reminders: [] },
  { name: 'Practical',    match: /^practical/i,                  color: '#FF6F00',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000005', reminders: [120] },
  { name: 'Q&A',          match: /^q\s*&\s*a/i,                  color: '#039BE5',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000006', reminders: [] },
  { name: 'Self-study',   match: /^self.?study/i,                color: '#7986CB',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000007', reminders: [] },

  // "Project supervised" covers both plain projects and hackathons — TimeEdit
  // gives them the same type, only the title differs.
  { name: 'Project',      match: /^project/i,                    color: '#8E24AA',
    id: '7c1e5a30-4b2f-4a61-9c10-000000000009', reminders: [] },
  { name: 'Presentation', match: /^presentation/i,               color: '#F6BF26',
    id: '7c1e5a30-4b2f-4a61-9c10-00000000000a', reminders: [] },

  { name: 'Meeting',      match: /^meeting/i,                   color: '#795548',
    id: '7c1e5a30-4b2f-4a61-9c10-00000000000e', reminders: [] },
  { name: 'Demo',         match: /^demo/i,                      color: '#AD1457',
    id: '7c1e5a30-4b2f-4a61-9c10-00000000000f', reminders: [] },

  // The third most common type across all of CreaTe: a lecture/tutorial hybrid.
  { name: 'Lectorial',    match: /^lectorial/i,                 color: '#3F51B5',
    id: '7c1e5a30-4b2f-4a61-9c10-00000000000c', reminders: [] },
  { name: 'Workshop',     match: /^workshop/i,                  color: '#009688',
    id: '7c1e5a30-4b2f-4a61-9c10-00000000000d', reminders: [] },

  // UT puts holiday periods in the feed with a date range where the activity
  // type would normally be, e.g. "20-12-2026 23:00 - 21-12-2026 23:00".
  { name: 'Holiday',      match: /^\d{2}-\d{2}-\d{4}/,           color: '#A79B8E',
    id: '7c1e5a30-4b2f-4a61-9c10-00000000000b', reminders: [] },
];

// Used when no rule matches — a grey event means "new activity type appeared".
const DEFAULT_RULE = { name: 'Other', color: '#616161',
  id: '7c1e5a30-4b2f-4a61-9c10-000000000008', reminders: [] };

// Umbrella course names to hide when something more specific follows:
// "Smart Technology Core – Systems & Signals" -> "Systems & Signals".
const DROP_PREFIXES = [
  // Year 1
  'Introduction to CreaTe',
  'Introduction to Engineering',
  'Intro Computer Science & Programming',
  'Living and Working Tomorrow',
  // Year 2
  'Smart Technology Core',
  'Smart Environments Core',
  'Design and Research of User Experience',
  'Art [&&] Impact',
];


/**
 * TimeEdit files a lot under the catch-all type "Other" and puts the real
 * category in the description's "Extra Info:" line. These rules read that line.
 * They only apply when nothing in RULES matched the activity type first.
 * `use` names a rule above; 'Other' means leave it grey.
 */
const EXTRA_RULES = [
  { match: /oral\s*exam|diagnostic\s*exam|group\s*test/i,        use: 'Exam' },
  { match: /mentor\s*meeting|meeting\s*group|group\s*challenge/i, use: 'Meeting' },
  { match: /sports\s*day/i,                                      use: 'Practical' },
  { match: /demomarkt|demo\s*mark/i,                              use: 'Demo' },
  { match: /feedback\s*session|sign.?off/i,                       use: 'Tutorial' },
  { match: /criteec|evaluation\s*panel|panel\s*meeting/i,         use: 'Other' },
];

/**
 * Last resort for "Other" events: match the course title instead. Some carry no
 * Extra Info line at all — a Professional Development slot is a lecture, a
 * DesResUX Project slot is project work, and only the title tells them apart.
 */
const TITLE_RULES = [
  { match: /project/i,                   use: 'Project' },
  { match: /professional\s*development/i, use: 'Lecture' },
];

// If nothing above resolves an "Other" event, this is what it becomes.
const UNRESOLVED_OTHER_IS = 'Other';

// Changes to events with these rules get a louder email subject, so a moved
// exam is distinguishable from a moved lecture on a phone lock screen.
const URGENT_RULES = ['Exam'];

// How long a deletion is remembered. Previously tombstones were dropped as
// soon as TimeEdit stopped publishing the event — so a class paused for a
// quartile and later republished came back.
const TOMBSTONE_TTL_DAYS = 400;

// Attempts per Calendar API call before giving up, with doubling backoff.
const API_RETRIES = 4;

// true = syncNow() and syncPast() log every change they would make and write
// nothing. Useful before letting it loose, or after editing RULES.
// Remember to set it back, or your calendar quietly stops updating.
const DRY_RUN = false;

/**
 * Overrides the per-rule reminders in one go.
 *   'rules'      use whatever each rule in RULES says (the default)
 *   'none'       no reminders on anything
 *   'exams-only' reminders on URGENT_RULES categories, nothing else
 *   'everything' anything without its own reminders gets one 30 minutes before
 */
const REMINDER_PROFILE = 'rules';

// For the update check. Point this at a raw file on GitHub containing just a
// version string, e.g. 1.2.0. Leave '' to never check.
const SCRIPT_VERSION = '1.0.0';
const VERSION_URL = '';

// restyleAll() forces colours back to RULES. Set true to let it override a
// colour you set by hand; false leaves your choices alone.
const RESTYLE_OVERRIDES_PINS = false;

// Activity types to ignore completely — no event is ever created for them.
// Cleaner than deleting each one by hand. Matched against the activity type.
// To drop the holiday markers instead of colouring them: /^\d{2}-\d{2}-\d{4}/
const SKIP_TYPES = [
  // Uncomment any of these to drop that category entirely:
  // /^\d{2}-\d{2}-\d{4}/,        // holiday and closure markers
  // /^self.?study/i,             // self-study blocks
  // /^project\s*unsupervised/i,  // unsupervised project time
];

// Events running local midnight to local midnight become all-day events,
// so holidays render as a tidy bar instead of blocking the whole day column.
const ALL_DAY_IF_FULL_DAY = true;

// Which emails you want. Each is independent; set any to false to silence it.
const EMAIL = {
  changes:  true,   // a room or time changed, or a class was cancelled
  failures: true,   // the sync refused to run — leave this on
  newTypes: true,   // TimeEdit introduced a category with no rule
  monthly:  true,   // a note on the 1st confirming it is still running
};

// Where mail goes. Leave '' to use the account running the script.
const NOTIFY_EMAIL = '';

// Safety net: abort rather than mass-delete if the feed suddenly shrinks.
const MIN_FEED_RATIO = 0.5;

// Calendar writes allowed per run. Apps Script stops dead at 6 minutes; this
// stops cleanly instead, and the next trigger picks up where this one left off.
const MAX_WRITES_PER_RUN = 200;

// State lives in Drive, not script properties — properties cap at 500KB, which
// a full year of events would exceed around March.
const STATE_FILENAME = 'timeedit-sync-state.json';
const BACKUP_FILENAME = 'timeedit-sync-state.backup.json';

// Fields protected from overwrite once you edit them by hand. Order matters:
// state stores one hash per field, joined by "|", in exactly this order.
const TRACKED_FIELDS =
  ['title', 'start', 'end', 'location', 'description', 'label', 'reminders'];

// ================================================================
//  RUN THESE
// ================================================================

/**
 * Does the whole install in one go: checks your settings, makes a calendar if
 * you have not named one, pushes the colour palette, runs a first sync and
 * turns on the timer. Safe to run again later — nothing here is destructive.
 */
function setup() {
  requireConfig_({ needCalendar: false });

  const props = PropertiesService.getScriptProperties();
  let id = CALENDAR_ID || props.getProperty('auto_calendar_id');

  if (id) {
    Logger.log('Using existing calendar: %s', id);
  } else {
    const cal = CalendarApp.createCalendar(NEW_CALENDAR_NAME, {
      summary: 'Timetable synced from TimeEdit',
      timeZone: Session.getScriptTimeZone(),
    });
    id = cal.getId();
    props.setProperty('auto_calendar_id', id);
    Logger.log('Created the calendar "%s".\n   Its id is %s\n'
             + '   Nothing to copy — the script remembers it.',
      NEW_CALENDAR_NAME, id);
  }

  const state = loadState();
  ensureLabels_(state, true);
  saveState(state);
  Logger.log('Colour palette installed (%s categories).', RULES.length + 1);

  Logger.log('\nRunning the first sync — this can take a minute...');
  runSync_(false);

  installTrigger();

  const types = {};
  parseIcs(fetchIcs()).forEach(e => {
    const r = classify(e);
    if (r === DEFAULT_RULE) {
      const t = activityType(e) || '(no type line)';
      types[t] = (types[t] || 0) + 1;
    }
  });

  Logger.log('\n============================================================');
  Logger.log('Done. Open Google Calendar and look at this week.');
  if (Object.keys(types).length) {
    Logger.log('\nThese show up grey because no rule matches them:');
    Object.keys(types).forEach(t => Logger.log('   %s  x%s', t, types[t]));
    Logger.log('Add a line to RULES for any you care about, then run restyleAll().');
  } else {
    Logger.log('Every activity type in your feed has a colour.');
  }
  Logger.log('\nOptional: run syncPast() to add weeks that already happened.');
  Logger.log('============================================================');
}

/**
 * Which calendar to write to: what you set, or the one setup() made.
 * Kept in script properties so an empty CALENDAR_ID still works.
 */
function calendarId_() {
  const id = CALENDAR_ID
    || PropertiesService.getScriptProperties().getProperty('auto_calendar_id');
  if (!id) {
    throw new Error('No calendar yet. Run setup() first, or paste a calendar '
                  + 'id into CALENDAR_ID near the top of the file.');
  }
  return id;
}

/**
 * Fails early with a message naming what to fix, instead of letting a missing
 * setting surface later as a DNS error or "Calendar is not defined".
 */
function requireConfig_(opts) {
  opts = opts || {};

  if (typeof Calendar === 'undefined') {
    throw new Error('The Calendar API service is not enabled. In the left '
      + 'sidebar click "Services +", choose "Calendar API", leave the '
      + 'identifier as "Calendar", and click Add.');
  }

  if (!ICS_URL) {
    throw new Error('ICS_URL is empty. Open cloud.timeedit.net/nl_utwente/web, '
      + 'select your programme and all four quartiles, set the date range to '
      + 'the whole year, click Subscribe, and paste the link into ICS_URL.');
  }

  if (!/^https?:\/\//i.test(ICS_URL)) {
    throw new Error('ICS_URL does not look like a link. It should start with '
      + 'https:// — you may have pasted a file name or a page title.');
  }

  if (opts.needCalendar !== false) calendarId_();
}

/** The sync. Runs on a schedule; run manually to apply changes immediately. */
function syncNow() {
  requireConfig_();
  withLock_(() => runSync_(false));
}

/** Same, but skips the shrinking-feed guard. Use if the feed legitimately drops. */
function forceSync() {
  requireConfig_();
  withLock_(() => runSync_(true));
}

/**
 * Adds past events that syncNow deliberately ignores — the first weeks of a
 * quartile you set this up mid-way through, or a whole previous year.
 *
 * Purely additive: it never updates or deletes anything, and the events it
 * creates are not tracked, so they are frozen history from then on. Safe to
 * run repeatedly — each event carries its TimeEdit UID, so nothing duplicates.
 */
function syncPast() {
  requireConfig_();
  withLock_(() => {
    const tz = Session.getScriptTimeZone();
    const windowEnd = startOfToday_();
    const windowStart = new Date(windowEnd.getTime() - PAST_SYNC_DAYS * 864e5);

    const state = loadState();
    const tombstones = state.tombstones;

    const feed = parseIcs(fetchIcs())
      .filter(e => e.end >= windowStart && e.start < windowEnd);

    if (!feed.length) {
      Logger.log('Nothing in the feed between %s and today. TimeEdit may no '
               + 'longer publish that far back.', windowStart.toDateString());
      return;
    }

    // Match on the stored TimeEdit UID, which is what makes re-running safe.
    // Events created before that property existed carry no UID, so fall back
    // to matching on the slot itself — otherwise they get duplicated.
    const seenUids = new Set();
    const seenSlots = new Set();
    listEvents_(windowStart, windowEnd).forEach(e => {
      const p = e.extendedProperties && e.extendedProperties.private;
      if (p && p.teUid) seenUids.add(p.teUid);
      seenSlots.add(slotKey_(startOf_(e).getTime(), endOf_(e).getTime(),
                             e.summary, e.location));
    });

    let created = 0, skipped = 0, budgetHit = false;

    for (const item of feed) {
      if (tombstones[item.uid] || seenUids.has(item.uid)) { skipped++; continue; }
      if (SKIP_TYPES.some(re => re.test(activityType(item)))) { skipped++; continue; }

      const res = buildResource_(item, classify(item), tz);
      const key = slotKey_(item.start.getTime(), item.end.getTime(),
                           res.summary, res.location);
      if (seenSlots.has(key)) { skipped++; continue; }

      if (created >= MAX_WRITES_PER_RUN) { budgetHit = true; break; }

      apiInsert_(res);
      seenSlots.add(key);
      created++;
    }

    Logger.log('Past backfill: created %s, already there or skipped %s.%s',
      created, skipped,
      budgetHit ? '\nWrite budget reached — run syncPast() again to continue.' : '');
  });
}

/** Rebuilds the schedule from SYNC_TIMES. Run after changing them. */
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['syncNow', 'monthlyReport'].indexOf(t.getHandlerFunction()) >= 0)
    .forEach(t => ScriptApp.deleteTrigger(t));

  SYNC_TIMES.forEach(([h, m]) => {
    ScriptApp.newTrigger('syncNow').timeBased()
      .everyDays(1).atHour(h).nearMinute(m).create();
  });

  ScriptApp.newTrigger('monthlyReport').timeBased()
    .onMonthDay(1).atHour(9).create();

  Logger.log('%s triggers active. Syncs at %s, health check on the 1st at 9:00.',
    ScriptApp.getProjectTriggers().length,
    SYNC_TIMES.map(t => t[0] + ':' + ('0' + t[1]).slice(-2)).join(', '));
}

/** Brings back events you deleted, then re-syncs. */
function restoreDeleted() {
  requireConfig_();
  withLock_(() => {
    const windowStart = startOfToday_();
    const windowEnd = new Date(windowStart.getTime() + DAYS_AHEAD * 864e5);

    const liveIds = new Set(listEvents_(windowStart, windowEnd).map(e => e.id));

    const state = loadState();
    const known = state.events;
    let dropped = 0;

    // A mapping whose event is no longer in the calendar is stale. Clearing the
    // tombstone without dropping it would just re-tombstone on the next run.
    parseIcs(fetchIcs())
      .filter(e => e.end >= windowStart && e.start <= windowEnd)
      .forEach(e => {
        const rec = known[e.uid];
        if (rec && !liveIds.has(bareId_(rec.g))) { delete known[e.uid]; dropped++; }
      });

    state.tombstones = {};
    saveState(state);
    Logger.log('Un-hid everything, dropped %s stale mappings. Syncing...', dropped);

    runSync_(false);        // inside the same lock — syncNow() would deadlock
  });
}

/**
 * Repaints events: label, reminders, and clears any old preset colour.
 * Overrides colours you set by hand — that is the point of it.
 * Budgeted, so run it repeatedly until it reports 0 remaining.
 */
function restyleAll() {
  requireConfig_();
  withLock_(() => {
    const state = loadState();
    ensureLabels_(state, true);

    const windowStart = startOfToday_();
    const windowEnd = new Date(windowStart.getTime() + DAYS_AHEAD * 864e5);

    const live = {};
    listEvents_(windowStart, windowEnd).forEach(e => { live[e.id] = e; });

    const known = state.events;
    const byUid = {};
    parseIcs(fetchIcs()).forEach(e => { byUid[e.uid] = e; });

    const uids = Object.keys(known);
    let done = 0, skipped = 0, preserved = 0;

    for (const uid of uids) {
      const item = byUid[uid];
      const res = item ? live[bareId_(known[uid].g)] : null;
      if (!res) continue;

      const rule = classify(item);
      const wantLabel = hash(rule.id);
      const wantRem = hash(remindersKey_(remindersFor_(rule)));
      const w = unpack_(known[uid].w);

      // A colour you set by hand shows as a label differing from what we last
      // wrote. Overwriting it would also overwrite the record of the pin, so
      // the edit would be lost rather than merely overridden.
      const yourColour = w[idx_('label')]
        && hash(res.eventLabelId || '') !== w[idx_('label')];
      if (yourColour && !RESTYLE_OVERRIDES_PINS) { preserved++; continue; }

      // Nothing to do for this one.
      if (res.eventLabelId === rule.id && !res.colorId
          && w[idx_('label')] === wantLabel && w[idx_('reminders')] === wantRem) {
        continue;
      }

      if (done >= MAX_WRITES_PER_RUN) { skipped++; continue; }

      delete res.colorId;                 // a preset colour would win over the label
      res.eventLabelId = rule.id;
      res.reminders = remindersResource_(remindersFor_(rule));
      apiUpdate_(res);

      w[idx_('label')] = wantLabel;
      w[idx_('reminders')] = wantRem;
      known[uid].w = w.join('|');
      // Keep the TimeEdit baseline in step, or the next sync reports a phantom change.
      if (known[uid].f) {
        const f = unpack_(known[uid].f);
        f[idx_('label')] = wantLabel;
        f[idx_('reminders')] = wantRem;
        known[uid].f = f.join('|');
      }
      done++;
    }

    saveState(state);
    Logger.log('Restyled %s events. %s still to do — run again if non-zero.'
             + '\n%s left alone because you had set their colour'
             + ' (set RESTYLE_OVERRIDES_PINS to change that).',
      done, skipped, preserved);
  });
}

/**
 * Deletes duplicate events. Two events are duplicates only when every tracked
 * field matches — time, title, room, description, colour and reminders — so
 * parallel tutorial groups, which differ by room, are never touched.
 *
 * Keeps the copy the script tracks, or failing that the oldest, and repairs
 * state for anything it removes. Deleting a tracked event without that repair
 * would make the next sync read it as your deletion and tombstone the class.
 *
 * Set DUPLICATES_DRY_RUN to true to see what it would delete without deleting.
 */
const DUPLICATES_DRY_RUN = false;

function removeDuplicates() {
  requireConfig_();
  withLock_(() => {
    const tz = Session.getScriptTimeZone();
    const windowStart = new Date(startOfToday_().getTime() - PAST_SYNC_DAYS * 864e5);
    const windowEnd = new Date(startOfToday_().getTime() + DAYS_AHEAD * 864e5);

    const state = loadState();
    const known = state.events;
    const tracked = {};
    Object.keys(known).forEach(uid => { tracked[bareId_(known[uid].g)] = uid; });

    const groups = {};
    listEvents_(windowStart, windowEnd).forEach(e => {
      const key = pack_(readEvent_(e));
      (groups[key] = groups[key] || []).push(e);
    });

    let deleted = 0, groupsFound = 0, repaired = 0;

    Object.keys(groups).forEach(key => {
      const list = groups[key];
      if (list.length < 2) return;
      groupsFound++;

      // Tracked first, then oldest: the survivor is the one state points at,
      // or the one most likely to carry edits you made.
      list.sort((a, b) => {
        const at = tracked[a.id] ? 0 : 1, bt = tracked[b.id] ? 0 : 1;
        if (at !== bt) return at - bt;
        return new Date(a.created || 0) - new Date(b.created || 0);
      });

      list.slice(1).forEach(dup => {
        if (deleted >= MAX_WRITES_PER_RUN) return;

        Logger.log('%s  %s  (%s)  -> %s',
          when_(startOf_(dup), tz), dup.summary || '', dup.location || '',
          DUPLICATES_DRY_RUN ? 'would delete' : 'deleted');

        if (!DUPLICATES_DRY_RUN) {
          apiRemove_(dup.id);
          const uid = tracked[dup.id];
          if (uid) { delete known[uid]; repaired++; }
        }
        deleted++;
      });
    });

    if (!DUPLICATES_DRY_RUN && deleted) saveState(state);

    Logger.log('\n%s duplicate groups, %s copies %s, %s state records repaired.',
      groupsFound, deleted,
      DUPLICATES_DRY_RUN ? 'would be removed' : 'removed', repaired);
    if (repaired) {
      Logger.log('Run syncNow() next — the removed copies were tracked, and the '
               + 'survivors get re-adopted from their stored UID.');
    }
  });
}

/**
 * Cross-checks state against the calendar and the feed, three ways:
 * records pointing at events that no longer exist, events the state does not
 * know about, and feed entries with no event at all. Writes nothing.
 */
function verify() {
  requireConfig_();
  const tz = Session.getScriptTimeZone();
  const windowStart = startOfToday_();
  const windowEnd = new Date(windowStart.getTime() + DAYS_AHEAD * 864e5);

  const state = loadState();
  const known = state.events;

  const live = {};
  const byTeUid = {};
  const groups = {};
  listEvents_(windowStart, windowEnd).forEach(e => {
    live[e.id] = e;
    const u = teUidOf_(e);
    if (u) byTeUid[u] = e;
    const key = pack_(readEvent_(e));
    (groups[key] = groups[key] || []).push(e);
  });

  const feed = parseIcs(fetchIcs())
    .filter(e => e.end >= windowStart && e.start <= windowEnd);

  const danglingRecords = [];
  const trackedIds = new Set();
  Object.keys(known).forEach(uid => {
    const id = bareId_(known[uid].g);
    trackedIds.add(id);
    if (!live[id]) danglingRecords.push(uid);
  });

  const untracked = Object.keys(live)
    .filter(id => !trackedIds.has(id))
    .map(id => live[id]);

  const missing = feed.filter(item =>
    !known[item.uid] && !byTeUid[item.uid] && !state.tombstones[item.uid]);

  const dupes = Object.keys(groups).filter(k => groups[k].length > 1);

  Logger.log('VERIFY  (%s events in feed window, %s in calendar, %s tracked)',
    feed.length, Object.keys(live).length, Object.keys(known).length);

  Logger.log('\n1. State records whose event is gone: %s', danglingRecords.length);
  if (danglingRecords.length) {
    Logger.log('   These become tombstones on the next sync — expected if you '
             + 'deleted them, a problem if you did not.');
    danglingRecords.slice(0, 20).forEach(uid => Logger.log('   %s', uid));
  }

  Logger.log('\n2. Calendar events the state does not track: %s', untracked.length);
  if (untracked.length) {
    Logger.log('   Events you added yourself and syncPast() backfills both land '
             + 'here and are fine. A synced-looking event is not.');
    untracked.slice(0, 20).forEach(e => Logger.log('   %s  %s%s',
      when_(startOf_(e), tz), e.summary || '(no title)',
      teUidOf_(e) ? '   [has a TimeEdit UID]' : ''));
  }

  Logger.log('\n3. Feed entries with no event and no tombstone: %s', missing.length);
  if (missing.length) {
    Logger.log('   The next sync should create these. If they persist, look at '
             + 'SKIP_TYPES or the write budget.');
    missing.slice(0, 20).forEach(e => Logger.log('   %s  %s',
      when_(e.start, tz), cleanTitle(e.summary || '')));
  }

  Logger.log('\n4. Duplicate groups: %s%s', dupes.length,
    dupes.length ? '   -> run removeDuplicates()' : '');

  Logger.log('\nLast successful sync: %s',
    state.lastOk ? new Date(state.lastOk).toString() : 'never');
}

/** Compares SCRIPT_VERSION against VERSION_URL. Returns a note, or ''. */
function updateNote_() {
  if (!VERSION_URL) return '';
  try {
    const res = UrlFetchApp.fetch(VERSION_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return '';

    const latest = res.getContentText().trim().split(/\s/)[0];
    if (!latest || latest === SCRIPT_VERSION) return '';

    return '\nA newer version is available: ' + latest
         + ' (you have ' + SCRIPT_VERSION + ').\n' + VERSION_URL + '\n';
  } catch (err) {
    return '';   // an update check is never worth failing a run over
  }
}

/**
 * Monthly note that the sync is alive. Silence otherwise means either nothing
 * changed or it died three weeks ago, and those should not look the same.
 */
function monthlyReport() {
  if (!EMAIL.monthly) return;

  const state = loadState();
  const windowStart = startOfToday_();
  const monthEnd = new Date(windowStart.getTime() + 31 * 864e5);

  let upcoming = 0, grey = 0;
  try {
    listEvents_(windowStart, monthEnd).forEach(e => {
      upcoming++;
      if (e.eventLabelId === DEFAULT_RULE.id) grey++;
    });
  } catch (err) {
    sendMail_('TimeEdit sync — monthly check FAILED',
      'Could not read the calendar: ' + err + '\n');
    return;
  }

  const lastOk = state.lastOk ? new Date(state.lastOk) : null;
  const staleDays = lastOk ? Math.floor((Date.now() - state.lastOk) / 864e5) : null;

  const body = [
    'Version: ' + SCRIPT_VERSION,
    'Events tracked: ' + Object.keys(state.events).length,
    'Feed size at last sync: ' + (state.feedCount || 0),
    'Deletions remembered: ' + Object.keys(state.tombstones).length,
    'Last successful sync: ' + (lastOk ? lastOk.toString() : 'never'),
    '',
    'Next 31 days: ' + upcoming + ' events, ' + grey + ' uncategorised',
    '',
    staleDays === null || staleDays > 2
      ? '*** No successful sync in ' + staleDays + ' days. Something is wrong. ***'
      : 'Syncing normally.',
    updateNote_(),
  ].join('\n');

  sendMail_(staleDays === null || staleDays > 2
    ? 'TimeEdit sync — NOT RUNNING'
    : 'TimeEdit sync — monthly check', body + '\n');
}

/** Events in the calendar that the script does not track. Report only. */
function findOrphans() {
  requireConfig_();
  const windowStart = startOfToday_();
  const windowEnd = new Date(windowStart.getTime() + DAYS_AHEAD * 864e5);
  const tz = Session.getScriptTimeZone();

  const tracked = new Set(
    Object.values(loadState().events).map(r => bareId_(r.g)));

  const orphans = listEvents_(windowStart, windowEnd).filter(e => {
    if (tracked.has(e.id)) return false;
    // Events created by syncPast() are untracked by design, not orphans.
    const p = e.extendedProperties && e.extendedProperties.private;
    return !(p && p.teUid);
  });

  if (!orphans.length) { Logger.log('No untracked events. Calendar is clean.'); return; }

  Logger.log('%s untracked events. Anything you added yourself will be listed '
           + 'here too — only delete what you recognise as a duplicate:', orphans.length);
  orphans.slice(0, 100).forEach(e =>
    Logger.log('  %s  %s', when_(startOf_(e), tz), e.summary || '(no title)'));
}

/** Every activity type in the feed, with counts. Use it to update RULES. */
function listActivityTypes() {
  requireConfig_();
  const counts = {};
  const all = parseIcs(fetchIcs());
  all.forEach(e => {
    const t = activityType(e) || '(no type line)';
    counts[t] = (counts[t] || 0) + 1;
  });
  Logger.log('%s events in the feed.\n%s', all.length, JSON.stringify(counts, null, 2));
}

/**
 * Shows the real events behind one activity type, with the description that
 * drives classification and the rule each one resolves to. Set INSPECT_TYPE
 * and run. Use '(no type line)' to see the malformed ones.
 */
const INSPECT_TYPE = 'Other';

function inspectType() {
  requireConfig_();
  const want = String(INSPECT_TYPE).toLowerCase();
  const tz = Session.getScriptTimeZone();
  let found = 0;

  parseIcs(fetchIcs()).forEach(e => {
    if ((activityType(e) || '(no type line)').toLowerCase() !== want) return;
    found++;
    Logger.log('%s  ->  %s\n    title: %s\n    where: %s\n    desc:  %s',
      when_(e.start, tz), classify(e).name, e.summary || '(none)',
      e.location || '(none)', String(e.description || '').replace(/\n/g, ' | '));
  });

  Logger.log('\n%s events of type "%s"', found, INSPECT_TYPE);
}

/** Previews title rewriting. Use it to update DROP_PREFIXES. */
function debugTitles() {
  requireConfig_();
  const seen = {};
  parseIcs(fetchIcs()).forEach(e => {
    const before = e.summary || '';
    if (seen[before]) return;
    seen[before] = true;
    Logger.log('%s\n   -> %s', before, cleanTitle(before));
  });
}

/** Restores the state file from its backup copy. */
function restoreStateFromBackup() {
  const files = DriveApp.getFilesByName(BACKUP_FILENAME);
  if (!files.hasNext()) { Logger.log('No backup file found.'); return; }

  const state = normalizeState_(JSON.parse(files.next().getBlob().getDataAsString()));
  saveState(state);
  Logger.log('Restored: %s tracked events, %s hidden.',
    Object.keys(state.events).length, Object.keys(state.tombstones).length);
}

/** Wipes all memory: deletions return, edit protection is lost. Last resort. */
function resetSync() {
  const f = driveFile_(STATE_FILENAME, 'state_file_id');
  if (f) f.setTrashed(true);
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('State cleared. The backup file is untouched — '
           + 'restoreStateFromBackup() will bring it back if this was a mistake.');
}

// ================================================================
//  THE SYNC
// ================================================================

function runSync_(force) {
  const tz = Session.getScriptTimeZone();
  const windowStart = startOfToday_();
  const windowEnd = new Date(windowStart.getTime() + DAYS_AHEAD * 864e5);

  const all = parseIcs(fetchIcs());
  const state = loadState();

  // --- guard: never let a broken feed empty the calendar ---
  if (!all.length) {
    abort_(state, 'feed returned zero events',
      'The TimeEdit feed responded but contained no events. Nothing was changed.\n\n'
    + 'Usually the subscribe URL has expired or changed. Check ICS_URL.');
    return;
  }
  const lastCount = state.feedCount || 0;
  if (!force && lastCount && all.length < lastCount * MIN_FEED_RATIO) {
    abort_(state, 'feed shrank from ' + lastCount + ' to ' + all.length + ' events',
      'The feed lost more than half its events since the last sync, so the\n'
    + 'calendar was left untouched rather than mass-deleting.\n\n'
    + 'If this is real, run forceSync() once. Otherwise check ICS_URL.');
    return;
  }

  ensureLabels_(state, false);

  const feed = all.filter(e => e.end >= windowStart && e.start <= windowEnd);

  // Events.list omits deleted events entirely, so presence here is proof the
  // event still exists — unlike Events.get, which returns deleted ones forever.
  const live = {};
  const byTeUid = {};
  listEvents_(windowStart, windowEnd).forEach(e => {
    live[e.id] = e;
    const u = teUidOf_(e);
    if (u) byTeUid[u] = e;
  });

  const tombstones = state.tombstones;
  const known = state.events;
  const seen = new Set();
  const hadState = Object.keys(known).length > 0;

  const changes = { created: [], moved: [], kept: [], cancelled: [], urgent: false };
  let created = 0, updated = 0, buried = 0, removed = 0, pinned = 0, skipped = 0;
  let writes = 0, sinceSave = 0, budgetHit = false, duplicateUids = 0, adopted = 0;
  const unknownTypes = {};

  const flush = () => { if (!DRY_RUN) saveState(state); sinceSave = 0; };

  for (const item of feed) {
    const uid = item.uid;
    if (writes >= MAX_WRITES_PER_RUN) { budgetHit = true; break; }

    // 7. A uid repeated inside one feed would otherwise orphan the first copy.
    if (seen.has(uid)) { duplicateUids++; continue; }
    seen.add(uid);
    if (tombstones[uid]) continue;

    const type = activityType(item);
    // Removed from `seen` deliberately: the cleanup pass then deletes any
    // event already created for a type you have since added to SKIP_TYPES.
    if (SKIP_TYPES.some(re => re.test(type))) { seen.delete(uid); skipped++; continue; }

    const rule = classify(item);
    // "Other" and untyped records are expected to stay grey — not worth mailing about.
    if (rule === DEFAULT_RULE && type && !/^other$/i.test(type)) {
      unknownTypes[type] = (unknownTypes[type] || 0) + 1;
    }
    const next = {
      title: cleanTitle(item.summary || ''),
      start: item.start.getTime(),
      end: item.end.getTime(),
      location: normLocation_(item.location),
      description: item.description || '',
      label: rule.id,
      reminders: remindersKey_(remindersFor_(rule)),
    };
    const nextFeed = pack_(next);

    let record = known[uid];

    // The calendar, not the state file, is the truth about what exists. If a
    // run died after inserting but before flushing state, the event is there
    // with its TimeEdit UID on it — adopt it instead of creating a second copy.
    if (!record && byTeUid[uid]) {
      const found = byTeUid[uid];
      record = compact_(found.id, next.start, pack_(readEvent_(found)), nextFeed);
      known[uid] = record;
      adopted++;
    }

    // ---------- already synced ----------
    if (record) {
      const res = live[bareId_(record.g)];

      if (!res) {
        tombstones[uid] = Date.now();   // you deleted it; respect that
        delete known[uid];
        buried++;
        if (++sinceSave >= 50) flush();
        continue;
      }

      const wrote = unpack_(record.w);               // what the script last wrote
      const feedWas = unpack_(record.f || record.w); // what TimeEdit last said
      const cur = readEvent_(res);
      const current = pack_(cur).split('|');
      const nextArr = nextFeed.split('|');

      const isPinned = {};
      const nextWrote = [];
      const diffs = [];
      const keptNotes = [];
      let dirty = false;

      TRACKED_FIELDS.forEach((f, i) => {
        // An empty baseline means "never recorded" — not an edit.
        const yours = !!wrote[i] && current[i] !== wrote[i];
        isPinned[f] = yours;

        if (yours) {
          nextWrote[i] = current[i];     // keep honouring your value
          // You still want to hear that TimeEdit moved the real thing.
          if (feedWas[i] && feedWas[i] !== nextArr[i]) {
            const d = describeChange_(f, cur, next, tz);
            if (d) keptNotes.push(d + '   [your version kept]');
          }
        } else {
          nextWrote[i] = nextArr[i];
          if (current[i] !== nextArr[i]) {
            dirty = true;
            const d = describeChange_(f, cur, next, tz);
            if (d) diffs.push(d);
          }
        }
      });

      if (TRACKED_FIELDS.some(f => isPinned[f])) pinned++;

      if (dirty) {
        if (!isPinned.title) res.summary = next.title;
        if (!isPinned.start && !isPinned.end) {
          const span = timeSpan_(item.start, item.end, tz);
          res.start = span.start;
          res.end = span.end;
        } else {
          // Start and end move together, so pinning one skips writing both.
          // Record what is actually on the event, or the unpinned half would
          // claim we wrote TimeEdit's value and turn the next real upstream
          // move into a phantom edit of yours.
          nextWrote[idx_('start')] = current[idx_('start')];
          nextWrote[idx_('end')] = current[idx_('end')];
        }
        if (!isPinned.location) res.location = next.location;
        if (!isPinned.description) res.description = next.description;
        if (!isPinned.label) {
          delete res.colorId;             // a preset colour would win over the label
          res.eventLabelId = next.label;
        }
        if (!isPinned.reminders) res.reminders = remindersResource_(remindersFor_(rule));

        apiUpdate_(res);
        updated++; writes++;
      }

      const label = when_(item.start, tz) + '  ' + next.title;
      if (diffs.length) changes.moved.push(label + '\n    ' + diffs.join('\n    '));
      if (keptNotes.length) changes.kept.push(label + '\n    ' + keptNotes.join('\n    '));
      if ((diffs.length || keptNotes.length) && isUrgent_(rule)) changes.urgent = true;

      known[uid] = compact_(res.id, next.start, nextWrote.join('|'), nextFeed);
      if (++sinceSave >= 50) flush();
      continue;
    }

    // ---------- new ----------
    const made = apiInsert_(buildResource_(item, rule, tz));

    known[uid] = compact_(made.id, next.start, nextFeed, nextFeed);
    created++; writes++;
    changes.created.push(when_(item.start, tz) + '  ' + next.title
      + (next.location ? '  (' + next.location + ')' : ''));
    if (isUrgent_(rule)) changes.urgent = true;
    if (++sinceSave >= 50) flush();
  }

  // ---------- dropped out of the feed ----------
  // Skipped entirely when the budget ran out: `seen` would be incomplete, and
  // every unprocessed event would look cancelled.
  if (!budgetHit) {
    const todayMs = windowStart.getTime();
    Object.keys(known).forEach(uid => {
      if (seen.has(uid)) return;
      if (writes >= MAX_WRITES_PER_RUN) { budgetHit = true; return; }

      const rec = known[uid];
      const res = live[bareId_(rec.g)];
      const start = rec.s || (res ? startOf_(res).getTime() : null);


      // Past events are history. Stop tracking, but never delete.
      if (start !== null && start < todayMs) { delete known[uid]; return; }

      if (res) {
        changes.cancelled.push(when_(startOf_(res), tz) + '  ' + (res.summary || ''));
        if (isUrgentLabel_(res.eventLabelId)) changes.urgent = true;
        apiRemove_(res.id);
        removed++; writes++;
      }
      delete known[uid];
    });

    // Expire on age, not on whether TimeEdit still publishes the event: a class
    // paused for a quartile and later republished must stay deleted.
    const cutoff = Date.now() - TOMBSTONE_TTL_DAYS * 864e5;
    Object.keys(tombstones).forEach(uid => {
      if (tombstones[uid] < cutoff) delete tombstones[uid];
    });
  }

  state.feedCount = all.length;
  state.lastOk = Date.now();
  if (!DRY_RUN) { saveState(state); backupState_(state); }

  Logger.log('feed %s | created %s | updated %s | your edits kept %s | you deleted %s | cancelled %s | skipped %s | hidden %s%s',
             all.length, created, updated, pinned, buried, removed, skipped,
             Object.keys(tombstones).length,
             budgetHit ? '\nWrite budget reached — the next run continues automatically.' : '');
  if (duplicateUids) Logger.log('%s repeated UIDs in the feed were ignored.', duplicateUids);
  if (adopted) Logger.log('%s existing events re-adopted from their stored UID '
                        + '(state was behind the calendar).', adopted);

  if (DRY_RUN) Logger.log('DRY RUN — nothing was written and no mail was sent.');
  if (hadState && !DRY_RUN) sendDigest_(changes, budgetHit);
  // A truncated run only saw part of the feed; recording that as the full set
  // would make the remainder look new next time.
  if (!budgetHit && !DRY_RUN) alertUnknownTypes_(state, unknownTypes);
}

// ================================================================
//  STATE  (stored in Drive: script properties cap at 500KB)
// ================================================================

/** One record: g=event id, s=start ms, w=what we wrote, f=what TimeEdit said. */
function compact_(gid, start, wrote, feed) {
  const rec = { g: gid, s: start, w: wrote };
  if (feed !== wrote) rec.f = feed;    // identical in the common case, so omit it
  return rec;
}

function pack_(obj) {
  return TRACKED_FIELDS.map(f => hash(String(obj[f]))).join('|');
}

function unpack_(packed) {
  const parts = String(packed || '').split('|');
  while (parts.length < TRACKED_FIELDS.length) parts.push('');
  return parts;
}

function idx_(field) {
  return TRACKED_FIELDS.indexOf(field);
}

/**
 * Finds the state file by remembered id, falling back to name. The id matters:
 * getFilesByName picks an arbitrary match, so an unrelated file with the same
 * name elsewhere in Drive could silently become the store.
 */
function driveFile_(name, key) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(key);

  if (id) {
    try {
      const f = DriveApp.getFileById(id);
      if (!f.isTrashed()) return f;
    } catch (err) { /* deleted — fall through to name lookup */ }
  }

  const it = DriveApp.getFilesByName(name);
  if (!it.hasNext()) return null;

  const f = it.next();
  props.setProperty(key, f.getId());
  return f;
}

function writeDrive_(name, key, json) {
  const f = driveFile_(name, key);
  if (f) { f.setContent(json); return; }

  const made = DriveApp.createFile(name, json, MimeType.PLAIN_TEXT);
  PropertiesService.getScriptProperties().setProperty(key, made.getId());
}

function saveState(state) {
  writeDrive_(STATE_FILENAME, 'state_file_id', JSON.stringify(state));
}

function loadState() {
  const f = driveFile_(STATE_FILENAME, 'state_file_id');
  if (f) {
    try { return normalizeState_(JSON.parse(f.getBlob().getDataAsString())); }
    catch (err) { Logger.log('State file unreadable: %s', err); }
  }
  return normalizeState_({});
}

function normalizeState_(s) {
  s = s || {};
  s.events = s.events || {};
  s.feedCount = s.feedCount || 0;

  // Tombstones used to be a bare list of uids. They now carry the time of
  // deletion so they can expire on age rather than on feed presence.
  if (Array.isArray(s.tombstones)) {
    const now = Date.now();
    const map = {};
    s.tombstones.forEach(uid => { map[uid] = now; });
    s.tombstones = map;
  }
  s.tombstones = s.tombstones || {};
  return s;
}

function backupState_(state) {
  try {
    writeDrive_(BACKUP_FILENAME, 'backup_file_id', JSON.stringify(state));
  } catch (err) {
    Logger.log('Backup failed (sync itself was fine): %s', err);
  }
}

// ================================================================
//  CALENDAR API HELPERS
// ================================================================

/** Pushes the label palette when RULES colours or names have changed. */
function ensureLabels_(state, force) {
  const labels = RULES.concat([DEFAULT_RULE]).map(r =>
    ({ id: r.id, name: r.name, backgroundColor: r.color }));
  const fingerprint = hash(JSON.stringify(labels));

  if (!force && state.labelFp === fingerprint) return;

  const cal = withRetry_('calendar get', () => Calendar.Calendars.get(calendarId_()));
  cal.labelProperties = { eventLabels: labels };
  withRetry_('calendar update', () => Calendar.Calendars.update(cal, calendarId_()));

  state.labelFp = fingerprint;
  Logger.log('Label palette updated (%s labels).', labels.length);
}

/**
 * Retries transient Calendar failures. Without this a single 503 aborts the
 * run, and any inserts made since the last state flush would be re-created
 * on the next run as duplicates.
 */
function withRetry_(what, fn) {
  let wait = 1000;
  for (let attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (err) {
      if (attempt >= API_RETRIES || !isTransient_(err)) throw err;
      Logger.log('%s failed (attempt %s of %s): %s — retrying in %ss',
        what, attempt, API_RETRIES, err, wait / 1000);
      Utilities.sleep(wait);
      wait *= 2;
    }
  }
}

function isTransient_(err) {
  return /\b(429|500|502|503|504)\b|rate limit|backend error|internal error|timed? ?out|temporarily|try again/i
    .test(String(err && err.message || err));
}

function apiInsert_(resource) {
  if (DRY_RUN) {
    Logger.log('DRY RUN would create: %s  %s  (%s)',
      resource.start.dateTime || resource.start.date,
      resource.summary, resource.location || '');
    return { id: 'dry-run' };
  }
  return withRetry_('insert', () =>
    Calendar.Events.insert(resource, calendarId_(), { eventLabelVersion: 1 }));
}

function apiUpdate_(resource) {
  if (DRY_RUN) {
    Logger.log('DRY RUN would update: %s', resource.summary);
    return resource;
  }
  // The etag arrives with every listed event. Echoing it back makes the update
  // conditional, so a concurrent edit from your phone turns into a 412.
  delete resource.etag;
  return withRetry_('update', () =>
    Calendar.Events.update(resource, calendarId_(), resource.id, { eventLabelVersion: 1 }));
}

function apiRemove_(id) {
  if (DRY_RUN) { Logger.log('DRY RUN would delete: %s', id); return; }
  return withRetry_('remove', () => Calendar.Events.remove(calendarId_(), id));
}

/** The TimeEdit UID stored on an event, or '' if it predates that. */
function teUidOf_(res) {
  const p = res.extendedProperties && res.extendedProperties.private;
  return (p && p.teUid) || '';
}

function listEvents_(timeMin, timeMax) {
  const out = [];
  let pageToken = null;
  do {
    const res = withRetry_('list', () => Calendar.Events.list(calendarId_(), {
      timeMin: rfc_(timeMin),
      timeMax: rfc_(timeMax),
      singleEvents: true,
      maxResults: 2500,
      eventLabelVersion: 1,
      pageToken: pageToken,
    }));
    (res.items || []).forEach(e => { if (e.status !== 'cancelled') out.push(e); });
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

/**
 * TimeEdit lists multiple rooms in one field and does not guarantee an order.
 * Sorting them means a reshuffle is not mistaken for a room change.
 */
function normLocation_(loc) {
  return String(loc || '').split(',')
    .map(part => part.trim()).filter(Boolean).sort().join(', ');
}

/**
 * Identity of an event for duplicate detection: when, what and where.
 * Room matters — parallel tutorial groups share a title and a time slot and
 * differ only by room, and they are not duplicates of each other.
 */
function slotKey_(startMs, endMs, title, location) {
  return [startMs, endMs,
          String(title || '').trim().toLowerCase(),
          normLocation_(location).toLowerCase()].join('|');
}

/** The Calendar API resource for a feed item. Shared by syncNow and syncPast. */
function buildResource_(item, rule, tz) {
  const span = timeSpan_(item.start, item.end, tz);
  return {
    summary: cleanTitle(item.summary || ''),
    location: normLocation_(item.location),
    description: item.description || '',
    start: span.start,
    end: span.end,
    eventLabelId: rule.id,
    reminders: remindersResource_(remindersFor_(rule)),
    // Lets syncPast() recognise its own work without keeping state for it.
    extendedProperties: { private: { teUid: item.uid } },
  };
}

/** Reads the tracked fields off a Calendar API event resource. */
function readEvent_(res) {
  return {
    title: res.summary || '',
    start: startOf_(res).getTime(),
    end: endOf_(res).getTime(),
    location: normLocation_(res.location),
    description: res.description || '',
    label: res.eventLabelId || '',
    reminders: remindersFrom_(res),
  };
}

function startOf_(res) { return parseApiDate_(res.start); }
function endOf_(res)   { return parseApiDate_(res.end); }

/**
 * All-day events carry a bare "2027-03-28", which Date parses as UTC midnight.
 * Building it componentwise keeps it local, so an all-day and a timed event
 * can be compared without a silent one- or two-hour skew.
 */
function parseApiDate_(slot) {
  if (slot.dateTime) return new Date(slot.dateTime);
  const m = String(slot.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
           : new Date(slot.date);
}

function remindersFrom_(res) {
  const r = res.reminders || {};
  if (r.useDefault) return 'default';
  return remindersKey_((r.overrides || [])
    .filter(o => o.method === 'popup').map(o => o.minutes));
}

/** REMINDER_PROFILE overrides what each rule asks for, in one place. */
function remindersFor_(rule) {
  const own = rule.reminders || [];
  switch (REMINDER_PROFILE) {
    case 'none':       return [];
    case 'exams-only': return isUrgent_(rule) ? own : [];
    case 'everything': return own.length ? own : [30];
    default:           return own;
  }
}

function remindersResource_(mins) {
  return {
    useDefault: false,
    overrides: (mins || []).map(m => ({ method: 'popup', minutes: m })),
  };
}

function remindersKey_(mins) {
  return (mins || []).slice().sort((a, b) => a - b).join(',');
}

/** CalendarApp ids carry a "@google.com" suffix the API does not use. */
function bareId_(id) {
  return String(id).replace(/@google\.com$/, '');
}

function rfc_(date) {
  return Utilities.formatDate(date, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/**
 * Midnight-to-midnight events become all-day events. UT's holiday markers span
 * exactly one local day, and as timed events they block out the whole column.
 * The >= 23h test is deliberate: a DST day is 23 or 25 hours long.
 */
function timeSpan_(start, end, tz) {
  const atMidnight = d => Utilities.formatDate(d, tz, 'HH:mm') === '00:00';
  const dayStr = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');

  if (ALL_DAY_IF_FULL_DAY && atMidnight(start) && atMidnight(end)
      && (end.getTime() - start.getTime()) >= 23 * 3600e3) {
    // All-day end dates are exclusive, which is exactly what the feed gives us.
    return { start: { date: dayStr(start) }, end: { date: dayStr(end) } };
  }
  return { start: { dateTime: rfc_(start) }, end: { dateTime: rfc_(end) } };
}

/** Emails once when TimeEdit introduces an activity type no rule covers. */
function alertUnknownTypes_(state, found) {
  const types = Object.keys(found).sort();
  const before = (state.unknownTypes || []).slice().sort();

  // Record the current set even when it is empty, so a type you have since
  // added a rule for will alert again if TimeEdit brings it back.
  if (types.join('|') !== before.join('|')) {
    state.unknownTypes = types;
    saveState(state);
  }

  const fresh = types.filter(t => before.indexOf(t) === -1);
  if (!fresh.length || !EMAIL.newTypes) return;

  sendMail_('New activity type in your timetable',
    'TimeEdit is publishing activity types that no rule in RULES matches, so\n'
  + 'these events are showing up grey:\n\n'
  + fresh.map(t => '  ' + t + '  (' + found[t] + ' events)').join('\n')
  + '\n\nTo colour them, add a line to RULES with a fresh UUID for its id,\n'
  + 'then run restyleAll(). To ignore them entirely, add a pattern to\n'
  + 'SKIP_TYPES instead.\n');
}

// ================================================================
//  INTERNALS
// ================================================================

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('Another sync is already running — skipping this one.');
    return;
  }
  try { fn(); } finally { lock.releaseLock(); }
}

/** Refuse to sync, and make sure you hear about it. */
function abort_(state, reason, detail) {
  Logger.log('ABORT: %s. Calendar left untouched.', reason);

  // Throttled to once every 12 hours — six triggers a day would otherwise spam.
  const last = state.lastAlert || 0;
  if (Date.now() - last < 12 * 3600e3) return;

  state.lastAlert = Date.now();
  saveState(state);

  if (!EMAIL.failures) return;

  const since = state.lastOk
    ? 'Last successful sync: ' + new Date(state.lastOk).toString()
    : 'No successful sync recorded yet.';

  sendMail_('TimeEdit sync stopped', detail + '\n\n' + since + '\n\nReason: ' + reason + '\n');
}

function startOfToday_() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function when_(date, tz) {
  return Utilities.formatDate(date, tz, 'EEE d MMM HH:mm');
}

/** Human-readable description of one field changing. Null = not worth reporting. */
function describeChange_(field, current, next, tz) {
  switch (field) {
    case 'title':
      return 'renamed: ' + current.title + '  ->  ' + next.title;
    case 'location':
      return 'room: ' + (current.location || '(none)') + '  ->  ' + (next.location || '(none)');
    case 'start':
      return 'moved: ' + when_(new Date(current.start), tz) + '  ->  ' + when_(new Date(next.start), tz);
    case 'end':
      return 'now ends ' + Utilities.formatDate(new Date(next.end), tz, 'HH:mm');
    default:
      return null;   // description, label and reminder changes are noise
  }
}

const DIGEST_MAX_LINES = 25;

function sendDigest_(changes, truncated) {
  const block = (heading, lines) => {
    if (!lines.length) return null;
    const shown = lines.slice(0, DIGEST_MAX_LINES).join('\n');
    const rest = lines.length - DIGEST_MAX_LINES;
    return heading + '\n' + shown + (rest > 0 ? '\n… and ' + rest + ' more' : '');
  };

  const blocks = [
    block('CANCELLED', changes.cancelled),
    block('CHANGED', changes.moved),
    block('CHANGED IN TIMEEDIT, NOT IN YOUR CALENDAR', changes.kept),
    block('NEW', changes.created),
  ].filter(Boolean);

  if (!blocks.length || !EMAIL.changes) return;

  let body = blocks.join('\n\n') + '\n';
  if (truncated) {
    body += '\nThis run stopped early on its write budget, so this list is '
          + 'partial. The rest follows in the next sync.\n';
  }

  // An exam moving matters more than a lecture moving, and the subject line is
  // all you see on a lock screen.
  sendMail_(changes.urgent ? 'EXAM CHANGE — schedule updated'
                           : 'Change in schedule', body);
}

function sendMail_(subject, body) {
  const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) { Logger.log('No email address available; set NOTIFY_EMAIL.'); return; }
  MailApp.sendEmail({ to: to, subject: subject, body: body });
}

/**
 * TimeEdit writes the activity type on its own line, directly above "ID <n>":
 *   Nikken
 *   Extra Info: Combi-assignment
 *   Tutorial        <- this
 *   ID 330280
 */
function activityType(item) {
  const lines = (item.description || '')
    .split('\n').map(s => s.trim()).filter(Boolean);
  const idx = lines.findIndex(l => /^ID\s+\d+$/i.test(l));
  return idx > 0 ? lines[idx - 1] : '';
}

function classify(item) {
  const type = activityType(item);
  const haystack = type || ((item.summary || '') + ' ' + (item.description || ''));

  for (const rule of RULES) {
    if (rule.match.test(haystack)) return rule;
  }

  // Nothing matched the type. For TimeEdit's "Other" catch-all the real
  // category lives in "Extra Info:", so try that before giving up.
  const extra = extraInfo(item);
  for (const er of EXTRA_RULES) {
    if (extra && er.match.test(extra)) return ruleByName_(er.use);
  }
  for (const tr of TITLE_RULES) {
    if (tr.match.test(item.summary || '')) return ruleByName_(tr.use);
  }

  if (/^other$/i.test(type)) return ruleByName_(UNRESOLVED_OTHER_IS);
  return DEFAULT_RULE;
}

/** The "Extra Info: ..." line from the description, without its prefix. */
function extraInfo(item) {
  const line = String(item.description || '').split('\n')
    .map(l => l.trim())
    .filter(l => /^extra\s*info\s*:/i.test(l))[0];
  return line ? line.replace(/^extra\s*info\s*:\s*/i, '').trim() : '';
}

function isUrgent_(rule) {
  return URGENT_RULES.indexOf(rule.name) >= 0;
}

/** Cancelled events are gone from the feed, so only their label identifies them. */
function isUrgentLabel_(labelId) {
  return URGENT_RULES.some(name => {
    const r = ruleByName_(name);
    return r !== DEFAULT_RULE && r.id === labelId;
  });
}

function ruleByName_(name) {
  for (const r of RULES) {
    if (r.name === name) return r;
  }
  return DEFAULT_RULE;
}

/** "Smart Technology Core. 202600288, Systems & Signals 202600288" -> "Systems & Signals" */
function cleanTitle(summary) {
  const parts = String(summary)
    .split(/[,.]/)
    .map(t => t.replace(/\b\d{6,}\b/g, '').trim())
    .filter(Boolean);

  const unique = [];
  parts.forEach(t => { if (unique.indexOf(t) === -1) unique.push(t); });

  const kept = unique.filter(t =>
    !DROP_PREFIXES.some(d => d.toLowerCase() === t.toLowerCase()));

  return (kept.length ? kept : unique).join(' – ') || summary;
}

// Truncated MD5. 8 base64 chars is 48 bits — collisions are not a realistic
// concern for a few hundred events, and it keeps the state file small.
const HASH_LEN = 8;

function hash(str) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str)).slice(0, HASH_LEN);
}

function fetchIcs() {
  const res = UrlFetchApp.fetch(ICS_URL, { muteHttpExceptions: true });
  const code = res.getResponseCode();
  if (code === 200) return res.getContentText();

  const hint =
    code === 410 ? 'That link has expired. TimeEdit rejects a subscribe link '
                 + 'once its date range is fully in the past — regenerate it '
                 + 'with the range set to the current academic year.'
  : code === 404 ? 'TimeEdit does not recognise that link. Regenerate it from '
                 + 'the Subscribe button rather than copying the page address.'
  : code === 403 ? 'TimeEdit refused the request. The link may be tied to a '
                 + 'session that has ended — generate a fresh one.'
  : code >= 500  ? 'TimeEdit is having trouble at its end. This usually clears '
                 + 'on its own; the next scheduled sync will retry.'
  : 'Check ICS_URL is the Subscribe link and not a page address.';

  throw new Error('Could not read your TimeEdit feed (HTTP ' + code + '). ' + hint);
}

function parseIcs(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let cur = null;

  lines.forEach(line => {
    if (line === 'BEGIN:VEVENT') { cur = {}; return; }
    if (line === 'END:VEVENT') {
      if (cur && cur.uid && cur.start && cur.end) events.push(cur);
      cur = null;
      return;
    }
    if (!cur) return;

    const idx = line.indexOf(':');
    if (idx < 0) return;
    const name = line.slice(0, idx).split(';')[0].toUpperCase();
    const value = line.slice(idx + 1);

    switch (name) {
      case 'UID':         cur.uid = value; break;
      case 'SUMMARY':     cur.summary = unescapeText(value); break;
      case 'DESCRIPTION': cur.description = unescapeText(value); break;
      case 'LOCATION':    cur.location = unescapeText(value); break;
      case 'DTSTART':     cur.start = parseIcsDate(value); break;
      case 'DTEND':       cur.end = parseIcsDate(value); break;
    }
  });

  return events;
}

function parseIcsDate(value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;

  const [, y, mo, d, h, mi, s, utc] = m;
  if (!h) return new Date(Number(y), Number(mo) - 1, Number(d));

  if (utc) {
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d),
                             Number(h), Number(mi), Number(s)));
  }
  return new Date(Number(y), Number(mo) - 1, Number(d),
                  Number(h), Number(mi), Number(s));
}

function unescapeText(v) {
  return v.replace(/\\n/gi, '\n')
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';')
          .replace(/\\\\/g, '\\')
          .trim();
}
