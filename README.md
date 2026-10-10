# Cold and Sour

Photograph the menu. Swipe the dishes. Eat what you both said yes to.

An installable app for two phones. Real icon on the home screen, opens fullscreen,
no browser bar. No App Store, no Play Store, no developer account, no server.

**Not one euro.** GitHub Pages, Supabase's free tier and Gemini's free tier between
them cover two people eating out several times a week, with no card on file anywhere.

## How a dinner goes

1. Either of you taps the camera and shoots the menu. Two or three photos if it's a
   long one — up to four in one go.
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

After setup, **⚙ settings** gives you a pairing link that carries all four keys
inside it. The other phone never repeats the setup.

**The reliable way, and the one to use if anything goes odd:**

1. On the phone, open the plain app address in **Safari** (iPhone) or **Chrome**
   (Android) — no link, no fragment, just `https://…/coldandsour/`.
2. Make the icon: iPhone **Share → Add to Home Screen**; Android **⋮ → Add to home
   screen** (or the Install prompt).
3. Open the app **from the icon**. It shows the setup screen.
4. Paste the pairing link into the box at the top — *Paste the pairing link here* —
   and press **Pair this phone**. Pick which of you it is. Done, permanently.

That last step is what makes it stick. iOS gives a home-screen app its own storage,
walled off from Safari, so anything you paired in Safari is invisible to the icon.
Pairing from inside the icon puts it in the right place.

**Add to Home Screen missing from the Share sheet?** You're not in Safari itself.
Links opened from Messages or WhatsApp run in an in-app browser that can't install
anything. Tap the compass / *Open in Safari* button first.

## Try it before any of that

Add `?demo=1` to the address. A fake Spanish bar menu, a partner who swipes at
random, everything saved on that device only. No keys, no camera, no Supabase.

## Where things live

```
app/index.html            the whole app — one file
app/supabase.sql          the two tables, shown to you during setup
app/sw.js                 offline shell
app/manifest.webmanifest  the home-screen icon and name
app/icons/                a heart with a bite out of it
```

Serve `app/` at the root of GitHub Pages, or point Pages at the `app` folder.

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
