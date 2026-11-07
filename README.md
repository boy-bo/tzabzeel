# TZABZEEL

A responsive editorial site for a boutique hotel and restaurant brand and
interior-photography studio. Built with Next.js, TypeScript, Tailwind CSS, OGL,
Lenis, and GSAP.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Before deployment, run:

```bash
npm run lint
npm run build
```

## Launch details

- Replace `BOOKING_URL` in `src/app/page.tsx` with the studio's confirmed
  discovery-call booking URL.
- Replace the sample Unsplash photography and fictional project descriptions
  with approved, licensed TZABZEEL portfolio assets and copy.
- The contact email and footer location labels are in `src/app/page.tsx`.

The site uses a shared OGL canvas when WebGL is available and keeps the image
elements visible as accessible static fallbacks when it is not. Motion effects
respect reduced-motion preferences.
