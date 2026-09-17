# {{projectNameHuman}}

Scaffolded with `forge` from the `react-ts` template: Vite + React + TypeScript,
no backend attached.

## Run it

```bash
npm install
npm run dev
```

## Add-ons

Picked at scaffold time, so this copy of the project only has what you selected:

- **Framer Motion** — `src/App.tsx` has a small animated card as a working example.
- **Lucide React** — an icon in the page title.
- **Tailwind CSS** — wired up via `@tailwindcss/vite` (no `tailwind.config.js`/PostCSS setup needed for basic usage); a utility-styled box in `App.tsx` proves it's working.
- **RTK Query** — `src/store/` (store + an example API slice hitting a public placeholder API), wired into `src/main.tsx` via `<Provider>`. `App.tsx` calls `useGetExampleQuery()` and shows the result.

Didn't pick one and want it later? `npm install` the package, then look at how
this project's own template files use it (`templates/react-ts/files/` in the
`forge` repo) for the wiring.
