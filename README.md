 # Thumbnail Creator — Vite + React 18 (Ready-to-deploy)

 ## Quick start
 1. unzip the project
 2. Run:
rm -rf node_modules package-lock.json
npm install
 3. Start dev server:
npm run dev

 ## Deploy to Vercel
 - Option A (recommended): Push this repo to GitHub, then import the repo into Vercel (https://vercel.com/new). Vercel will auto-detect Vite and build.
 - Option B: Use Vercel CLI:
   npm i -g vercel
   vercel login
   vercel

 Notes:
 - Project pins React 18 + react-konva@18 to avoid React 19 compatibility issue.
 - YouTube thumbnail import tries multiple sizes; some thumbnails may be blocked by CORS — export can fail for CORS-blocked images.
