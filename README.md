# Recipe Box

A recipe app made for the iPad: big touch targets, a two-column cooking view,
tap-to-check ingredients and steps, and a "keep screen on" switch.

- **Scale servings**: the − / + stepper rescales every amount (1½ cups → 2¼ cups).
- **Photo import**: on *Add recipe*, take a photo of a printed recipe (several pages
  are fine) and AI fills in the form for you to check.
- **Browser button**: a bookmarklet that sends the recipe page you're looking at to
  the app. AI reads it and opens a filled-in form. Set it up at `/bookmarklet`.
- **Passcode**: anyone can read recipes; adding, editing and deleting asks for the
  passcode once per device (remembered for 90 days, "Lock" in the header forgets it).

Recipes are stored in SQLite at `data/recipes.db`.

## Setup

```bash
npm install
cp .env.example .env.local   # then set the passcode, secret and API key
npm run dev
```

| Variable | What it is |
| --- | --- |
| `RECIPE_PASSCODE` | Passcode for add/edit/delete |
| `SESSION_SECRET` | Long random string (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Claude API key, used for photo and web import |
| `DATABASE_PATH` | Optional, defaults to `./data/recipes.db` |

## Using it on the iPad

Run the app on a computer that stays on, then open its address on the iPad
(`npm run dev` prints a `Network:` URL like `http://192.168.1.66:3000`). In Safari,
*Share → Add to Home Screen* gives it its own icon and full-screen window.

For the browser button to work on recipe sites, which are served over HTTPS, the app
should also be reachable over HTTPS (for example through a reverse proxy or a tunnel
such as Tailscale Serve). Over plain HTTP, Safari warns before sending the page.

For a long-running install, use the production server:

```bash
npm run build
npm start
```

Back up `data/recipes.db` to keep your recipes safe.
