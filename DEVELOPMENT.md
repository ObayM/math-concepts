# Setting up a development environment

Developers, we're ready for launch!

You'll need Node.js, Docker (for the local Postgres database), and optionally a Gemini API key

## First-time setup

**1. Grab those dependencies!**

```bash
npm install
```

**2. Duplicate your environment file!**

```bash
cp .env.example .env
```

Open up `.env` and put in your secrets:

- `BETTER_AUTH_SECRET`: Run `openssl rand -base64 32` to generate a fresh secret!
- `GEMINI_API_KEY`: Grab one from [Google AI Studio](https://aistudio.google.com/app/apikey) if you want the cool AI features to work (they're optional but highly recommended!).

Everything else can stay as the defaults for local development.

**3. Fire up the database and the dev server!**

```bash
make dev
```

This will boot up a Postgres container and get Next.js running. Give it a second until you see the nice `✓ Ready` in your terminal!

**4. Push that database schema!**

```bash
make migrate
```

**5. Seed those lessons!**

```bash
make seed
```

That's all it takes! Pop open [http://localhost:3000](http://localhost:3000) and watch the magic happen.

---

## Keeping the engine running (Day-to-day)

If you already did all of the setup steps above previously, but e.g. your PC restarted, you only need a few commands to get right back to work:

- Start everything up (Postgres + Next.js):
  ```bash
  make dev
  ```
- Stop the Postgres database when you're done:
  ```bash
  make stop
  ```
- Open Prisma Studio to browse or edit your database visually:
  ```bash
  make studio
  ```

---

## Common Tasks

**Changed the schema?**

If you edit `prisma/schema.prisma`, make sure to sync it up by running:

```bash
make migrate
```

**Want to add a new lesson?**

Lessons are stored in the database. You can add them visually using Prisma Studio (`make studio`), or edit the source array in `src/app/api/create-lessons/route.js` and re-run:

```bash
make seed
```

**Testing email verification in dev**

We don't have SMTP set up by default in development. When you sign up a user, keep your eyes on the Next.js terminal! The verification link will print right there. Copy and paste that link into your browser to verify your account.

If you want to test SMTP just add these SMTP configuration lines to your `.env.local`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@example.com
SMTP_PASSWORD=yourpassword
SMTP_FROM=noreply@mathly.com
```

---

## Starting Fresh

If something gets super weird or you just want a clean environment to start over:

```bash
make clean    # This nukes all containers, volumes, and node_modules!
npm install
make dev
make migrate
make seed
```
