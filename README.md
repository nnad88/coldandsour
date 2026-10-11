# Cold and Sour

Photograph the menu. Swipe the dishes. Eat what you both said yes to.

An installable app for two phones. Real icon on the home screen, opens fullscreen,
no browser bar. No App Store, no Play Store, no developer account, no server.

**Not one euro.** GitHub Pages, Supabase's free tier and Gemini's free tier between
them cover two people eating out several times a week, with no card on file anywhere.

## How a dinner goes

1. Either of you shoots the menu, or taps **Upload a screenshot** to use one from the
   gallery — handy when somebody has WhatsApped you the menu. Photos collect in a tray,
   so you can go page by page: starters, mains, the specials board, as many as ten. Drop
   the blurry ones before reading. On a laptop you can paste from the clipboard instead.
2. A loading bar runs while Gemini reads the photo. It throws out every drink and
   every dessert and keeps only food you can order.
3. **GO** appears. The other phone sees it too, within a few seconds.
4. You both swipe, independently, at your own speed. Right for yes, left for no, or
   use the buttons. The arrow in the middle undoes the last one.
5. Whoever finishes first sees how far behind the other is. When you're both done,
   the matches are in.

Dish names stay exactly as the menu printed them, so you can point at the right line.
The descriptions come out in English even when the menu isn't — which is the whole
point of using this abroad.

## Setting it up, once, on a laptop

Open the app's address. It shows a five-step setup screen.

1. **supabase.com** → sign up free → **New project**. Any name, any region. Two
   minutes to build.
2. The app gives you a block of SQL with a copy button. In Supabase:
   **SQL Editor → New query → paste → Run**.
3. **Project Settings → Data API** for the Project URL, then
   **Project Settings → API Keys** for the **publishable key** (older projects call
   it *anon public*). Two separate pages. Never the *secret* key.
4. **aistudio.google.com/apikey** → **Create API key**. Free, no card. This is the
   one that reads the photos.
5. Both your names, and which of you is holding this phone. Press **Start**.

Nothing to edit in any file. No account to make with me.

## Getting it onto the phones

Open **⚙ settings** on the device you set up. It shows **one link per person** — they
are not the same link. Each one already knows whose phone it is, so there is nothing
to choose at the other end.

### iPhone

iOS gives a home-screen icon its own storage, walled off from Safari. That is the one
thing that makes this fiddly, and there are two ways around it. Either works.

**A — install first, paste second.** The one that always works.

1. In **Safari**, open the plain address: `https://nnad88.github.io/coldandsour/`
2. **Share → Add to Home Screen.**
3. Open the app **from the icon**. The setup screen appears.
4. Paste her link into the yellow box at the top, press **Pair this phone**. Done.

**B — open the link, then install from that page.**

1. Open her link in **Safari** (scan the code in settings with the camera, or tap the
   link from a message). It says *Paired* straight away.
2. **Without navigating away**, do **Share → Add to Home Screen** on that exact page.
   The pairing travels with it.
3. Open from the icon. It is already paired.

If B does not take — the icon opens on the setup screen — just do A. Nothing is broken
and nothing is lost.

**No Share option in the menu?** You are not in Safari itself. Links opened from
WhatsApp or Messages run in an in-app browser that cannot install anything. Tap the
compass / *Open in Safari* button first.

### Android

Open her link in **Chrome**, then **⋮ → Add to home screen**. Chrome keeps the same
storage, so it is paired either way round.

## Try it before any of that

Add `?demo=1` to the address. A fake Spanish bar menu, a partner who swipes at
random, everything saved on that device only. No keys, no camera, no Supabase.

## Where things live

```
index.html            the whole app — one file
supabase.sql          the two tables, shown to you during setup
sw.js                 offline shell
manifest.webmanifest  the home-screen icon and name
icons/                a heart with a bite out of it
```

GitHub Pages serves this repo's root, so the app is the repo.

## Worth knowing

- **Your keys never leave your two phones.** They're pasted at setup and kept in
  that phone's local storage. Nothing is committed to this repo, so the repo is safe
  to make public — which it has to be for GitHub Pages to be free.
- **The photo goes to Google.** That's the one external call, and it's the only way
  to read a menu for nothing. Nothing else about you is sent anywhere.
- **Updates.** Push a change, both phones have it next time they open the app.
  Bump `CACHE` in `sw.js` when you change the shell, or the old one lingers.
- **Offline.** The app opens offline, but shooting a menu and syncing votes need a
  connection. Votes you cast offline are kept and pushed on the next swipe that lands.
- **No realtime, on purpose.** Supabase realtime can't see the pair header the row
  security uses, so the app polls every 3–5 seconds instead. At two people that costs
  nothing and never breaks.
- **Supabase pausing.** Free projects pause after about a week of no activity.
  Opening the app counts, so this rarely comes up. The dashboard has a Restore button.
- **Gemini's free tier** has a daily request cap. One dinner is one request. You will
  not get near it.
- **Your data** lives in your own Supabase project. Nobody else has it.
