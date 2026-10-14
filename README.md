# DAWREM Downloader 🚀

A self-hosted web app for analyzing supported media links and preparing downloads that the visitor owns or is authorized to process. Provider availability changes over time, so verify every supported flow against the current provider behavior before launch.

---

## 🌟 Key Features

- **Automated Platform Detection**:
  - Automatically identifies **YouTube**, **Instagram**, **Facebook**, **TikTok**, and **Pinterest** from raw input URLs.
  - Zero manual platform dropdowns required.

- **Optional media processing**:
  - Audio conversion and supported format preparation use FFmpeg when required.
  - Watermark processing is off by default. Only enable it for media you own or have explicit permission to edit, and follow the source platform's rules.

- **Clean Format & Quality Selection**:
  - Displays **only real, verified available formats** (e.g. 1080p Full HD, 720p HD, 480p, and MP3 audio).
  - High-quality audio extraction with variable/high bitrate MP3 encoding.

- **Real-time Download Pipeline & Progress Tracking**:
  - Live progress tracking across explicit lifecycle stages:
    - `Preparing` ➔ `Downloading` ➔ `Processing` (FFmpeg) ➔ `Completed` ➔ `Failed`.
  - Shows bytes downloaded, total file size, real-time download speed, and percentage.
  - Single-item downloads can be cancelled; failed jobs can be retried, and completed jobs require an explicit save action.
- **Private recent activity**: The last five completed file names/formats are kept in the current page's memory only. No media URLs or temporary download links are stored in this history.

- **Ephemeral Storage & Automatic Cleanup**:
  - Media is processed in safe temporary directories.
  - Automatic delayed cleanup after streaming to browser.
  - Safety TTL sweep removes any orphaned temporary files older than 15 minutes.

- **Current stack & security controls**:
  - **Next.js 16 (Turbopack)** + **React 19**
  - Modern **`proxy.ts`** architecture for response security headers and process-local rate limiting.
  - HTTPS-only link validation, request-body size limits, and public-host checks on direct media downloads.
  - Path containment checks on file streaming and temporary-file cleanup.

---

## 🏗️ Architecture

```
app/
├── api/
│   ├── analyze/            # POST: URL validation & platform analysis
│   ├── download/           # POST: Background download job initialization
│   │   ├── progress/       # GET: Real-time progress metric polling
│   │   └── file/           # GET: Safe stream response & auto cleanup
├── layout.tsx              # Theme provider & root layout
├── page.tsx                # Clean, minimalist hero & media card UI
└── globals.css             # Light & Dark design system

lib/
├── platforms/
│   ├── detector.ts         # Pure URL pattern platform recognition
│   ├── types.ts            # Strongly-typed data contracts
│   ├── ytdl-helper.ts      # yt-dlp execution & format extractor
│   ├── youtube.ts          # YouTube handler
│   ├── tiktok.ts           # TikTok handler (with no-watermark prioritization)
│   ├── instagram.ts        # Instagram Reel & Carousel handler
│   ├── facebook.ts         # Facebook Post & Reel handler
│   └── pinterest.ts        # Pinterest Pin image & video handler
│
├── media/
│   ├── processor.ts        # FFmpeg format conversion & filter processor
│   ├── watermark.ts        # Delogo coordinate generator & dimension probe
│   ├── formatter.ts        # Duration, bytes, and safe filename formatters
│   ├── cleanup.ts          # Ephemeral file sweep & path traversal safety
│   └── download-job.ts     # In-memory download lifecycle manager
│
├── validation/
│   └── url-validator.ts    # Zod schemas, URL structure & SSRF guard
│
├── errors/
│   └── downloader-errors.ts # Unified domain errors & sanitized user messages
│
├── config.ts               # Binary discovery & environment limits
└── proxy.ts                # Next.js 16 Proxy router, rate limiter & security
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 3. Production Build
```bash
npm run build
npm run start
```

### 4. Verify a local production build
```bash
npm run lint
npx tsc --noEmit
npm run build
```

The scripts under `scripts/` include provider experiments and may contact external services or download real media. Review a script before running it; do not treat those scripts as a deterministic test suite.

---

## Security and deployment limits

- The proxy rate limiter and download-job registry are process-local. They do not coordinate across multiple Node processes, serverless instances, or regions. Use a single persistent Node instance for this implementation, or replace them with shared storage/queue infrastructure before horizontal scaling.
- The host must provide a writable temporary directory with enough disk space, plus working `yt-dlp`, FFmpeg, and FFprobe binaries. Serverless platforms with short execution limits or ephemeral storage may not support the download pipeline.
- The proxy rate limit is only as reliable as the client IP header supplied by the hosting proxy. Deploy behind a trusted proxy and configure its forwarded headers correctly.
- Direct media URLs are checked for HTTPS and non-public DNS results before download. DNS can change between validation and connection; this implementation does not pin the resolved address.
- Temporary media and job state are deleted on a best-effort basis. Monitor disk usage and confirm cleanup on the target host.
- `NEXT_PUBLIC_*` values are public browser configuration, not secrets. Never place credentials, API keys, or private tokens in them.

## Publishing, privacy, and Adsterra

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` and
`NEXT_PUBLIC_CONTACT_EMAIL` to the real production values. Do not publish with
the example domain or mailbox.

The Adsterra slot is disabled until both `NEXT_PUBLIC_ADSTERRA_SCRIPT_URL` and
`NEXT_PUBLIC_ADSTERRA_CONTAINER_ID` are set. Add the exact script URL and
container ID from the approved Native Banner snippet in your Adsterra account.
Never paste account passwords or private dashboard credentials into the app. Session cookies are sensitive account credentials; avoid using them and never enter a cookie belonging to another person.

Legal pages are available at `/privacy`, `/terms`, `/copyright`, and `/contact`.
Review and adapt them to your operator details, hosting/logging, applicable law,
and the ad provider's requirements before public launch. Only enable downloads
for content you own or are authorized to process.
