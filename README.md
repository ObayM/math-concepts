<h1 align="center">
  Mathly
</h1>
<h3 align="center">Learn math by playing with it</h3>

> [!NOTE]
> Mathly is live but still early and the Arabic side is still far from complete!

I always liked math but it was hard for others to understand it, and for me sometimes. The problem with traditional math is it's just reading or listening to a teacher explain it on a whiteboard, which might not click with everyone. Thanks to people like 3Blue1Brown who inspired some of this.

So I built a platform where it's all based on interactivity. I've been using it myself to teach myself some of the math I get in school. You drag a point along a curve and watch the tangent follow. You build an equation one piece at a time. You sketch a graph before the answer is revealed. When you get something wrong, the lesson doesn't just say "try again", it takes a detour to walk you through exactly what you missed, then puts you back where you were.

## How it works

Lessons are written in **Prism**, a small language I made for this. You write a lesson as text, the compiler turns it into validated data, and the browser plays that data back, with some security in mind (browser can't run code like `eval()`).

```
Prism source → compiler → validated data → player → React/SVG
```

Prism has interactive diagrams (drag points, toggle things, animate timelines), eight exercise types (quiz, numeric, build, hotspot, sketch, match, order, sort), adaptive branching when you get stuck, and a built-in AI tutor that can see what slide you're on.

There's a full reference site at `/prism` with a cookbook, playground, and error index. If you run `make dev` you can browse it locally.

## Get started

You need Docker (for Postgres) and Node.

```bash
make dev     # boots postgres + next dev
make seed    # compiles the .prism lessons and loads them
```

See `DEVELOPMENT.md` for the full setup.

## Tech

Next.js 16, React 19, Better Auth, Prisma 6 + Postgres, Tailwind v4, KaTeX, Monaco, Vitest + Playwright, Vercel AI SDK + Gemini.

## Credits

- Claude, for a lot of typing.
- 3Blue1Brown and other math visualization tools, for being an inspiration to start this project.
- And me :)

Thank you for reading that
