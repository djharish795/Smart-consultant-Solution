# 🌟 Smart Consultant Solution — Core Engine

> **AI-Powered Property Valuation & Telugu Sale Deed Analysis Studio**
>
> *Leveraging Claude AI models, Next.js, and Supabase for seamless report generation, legal document parsing, and bank-ready valuation synthesis.*

---

## ✨ Key Features

- **📂 Template Digital Twin**: Reconstructs standard bank-authorized PDF/image templates into custom HTML layouts.
- **📄 Telugu Sale Deed Parsing**: Powered by Claude's multi-modal intelligence, automatically extracts legal data from scanned, handwritten, or digital Telugu Sale Deeds.
- **🧮 Automatic Financial Mathematics**: Inputs base and government rates; automatically computes all dimensions, area totals, valuations, deductions, and schedules.
- **⚡ Interactive Credit & Limit Tracking**: Real-time credits tracking using Supabase backend authentication and profiles.
- **🔒 Secure Supabase Backend**: Integrated User Auth, Profile syncing, and historical report preservation using secure PostgreSQL databases.
- **🖨️ Bank-Ready Export**: Produces high-fidelity, printable PDF/HTML reports mimicking institutional layouts exactly.

---

## 🗂 Project Architecture

```
smart-consultant-core/
├── src/
│   ├── app/
│   │   ├── (dashboard)/                # Dashboard views (Archive, Profile, Pricing, Settings)
│   │   ├── api/
│   │   │   ├── analyze-template/       # POST: Reconstructs layout and outputs template JSON
│   │   │   ├── extract-data/           # POST: Extracts property info from Telugu PDF/Image
│   │   │   └── generate-report/        # POST: Generates beautiful HTML/PDF from data
│   │   ├── login/                      # Supabase SSR User Authentication flow
│   │   ├── globals.css                 # Root styles, Tailwind imports, and design tokens
│   │   └── layout.tsx                  # Global fonts, provider setup, and layout wrapper
│   ├── components/
│   │   ├── CreditTracker.tsx           # Tracks and displays remaining credits in real time
│   │   ├── FileUploader.tsx            # Drag-and-drop document acquisition panel
│   │   ├── ValuationForm.tsx           # Editable smart-data review form
│   │   └── Header.tsx                  # Clean global navigation & branding
│   └── lib/
│       ├── supabase/                   # Supabase server & client configuration (SSR-safe)
│       ├── cache-utils.ts              # Server-side data caching strategies
│       └── utils.ts                    # Dynamic Tailwind class merging helpers
├── public/                             # Public icons, favicons, and images
├── supabase-schema.sql                 # Complete database schema (tables, policies, triggers)
├── tailwind.config.ts                  # Tailwind theme, typography, and styling config
├── tsconfig.json                       # TypeScript compiler options
└── package.json                        # Node.js project manifests & dependencies
```

---

## 💾 Database Schema (Supabase / PostgreSQL)

Smart Consultant Core uses a secure PostgreSQL database on Supabase. Apply `supabase-schema.sql` to your Supabase SQL editor:

### `profiles` Table
Stores user profile information, pricing plans, and remaining API credits.
*   **RLS Policies**: Users can select all profiles, but insert/update only their own.
*   **Auto-Trigger**: Automatically populates profile records upon new user signup.

### `reports` Table
Preserves generated valuation templates, historical extraction data, and statuses.
*   **RLS Policies**: Restricts read/write access strictly to the owner.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Anthropic API Key** (from [console.anthropic.com](https://console.anthropic.com))
- **Supabase Project** (from [supabase.com](https://supabase.com))

---

### 1. Clone the Repository
```bash
git clone https://github.com/djharish795/Smart-consultant-Solution.git
cd "Smart-consultant-Solution/Smart consultant core"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Config
Create a `.env` file in the root of the project:

```env
# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-latest

# Supabase Server and Client Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anonymous-public-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application in action.

---

## ⚙️ Available Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Spins up the development server on `localhost:3000` |
| `npm run build` | Compiles production-optimized code |
| `npm run start` | Runs the compiled production server |
| `npm run lint` | Analyzes code quality using ESLint |

---

## 📄 License & Maintainer

- **Developer**: [djharish795](https://github.com/djharish795)
- **Status**: Active Client Project
- **License**: Private / Proprietary — All rights reserved © 2026.
