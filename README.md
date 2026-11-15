# Recipe Box

A recipe app made for the iPad: big touch targets, a two-column cooking view,
tap-to-check ingredients and steps, and a "keep screen on" switch.

- **Scale servings**: the − / + stepper rescales every amount (1½ cups → 2¼ cups).
- **Photo import**: on *Add recipe*, take a photo of a printed recipe (up to 4
  pages) and AI fills in the form for you to check.
- **Browser button**: a bookmarklet that sends the recipe page you're looking at to
  the app. AI reads it and opens a filled-in form. Set it up at `/bookmarklet`.
- **Passcode**: anyone can read recipes; adding, editing and deleting asks for the
  passcode once per device (remembered for 90 days, "Lock" in the header forgets it).

Recipes are stored in [Turso](https://turso.tech) (hosted SQLite). The tables are
created automatically the first time the app connects.

## Local development

```bash
npm install
cp .env.example .env.local   # set the passcode, secret and API key
npm run dev
```

With `TURSO_DATABASE_URL` left empty, local development uses a SQLite file at
`data/recipes.db`. Set the Turso variables in `.env.local` to work against the real
database instead.

| Variable | What it is |
| --- | --- |
| `RECIPE_PASSCODE` | Passcode for add/edit/delete |
| `SESSION_SECRET` | Long random string (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Claude API key, used for photo and web import |
| `TURSO_DATABASE_URL` | `libsql://…` URL of your Turso database |
| `TURSO_AUTH_TOKEN` | Turso database token |

## Deploying to Vercel

1. Import the GitHub repo in Vercel.
2. Create the database: either add **Turso** from the Vercel Marketplace (it fills in
   the database variables), or create one with the Turso CLI:

   ```bash
   turso db create recipes
   turso db show recipes --url
   turso db tokens create recipes
   ```

3. In the Vercel project's **Settings → Environment Variables**, add all five
   variables from the table above, then redeploy.
4. On the iPad, open the Vercel URL in Safari and choose *Share → Add to Home
   Screen*. Set up the browser button from the app's **Browser button** page.
