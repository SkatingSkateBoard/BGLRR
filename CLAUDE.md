@AGENTS.md

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4, Shadcn UI, Lucide React
- **Real-time**: LiveKit, Deepgram (STT), Krisp (Noise Filter)
- **Backend**: Supabase (DB, Auth, SSR)
- **Mapping**: Leaflet + React Leaflet
- **Deployment**: OpenNext + Cloudflare (Wrangler)
- **PWA**: `@ducanh2912/next-pwa`

## Folder Architecture
- `app/`: Routing & Modules (Operator-Browser, Resident-PWA, admin, actions)
- `components/`: Reusable UI components
- `lib/`: Core business logic & shared libraries
- `actions/`: Server Actions for data mutations
- `types/`: TypeScript interfaces/types
- `utils/`: Helper functions

## Key Entry Points
- `app/layout.tsx`: Root layout
- `app/Operator-Browser/`: Primary responder interface
- `app/Resident-PWA/`: Resident-facing PWA interface
- `app/actions/`: Server-side logic
