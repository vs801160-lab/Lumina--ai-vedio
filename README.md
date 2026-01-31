
# 🎥 Lumina AI Video Pro
### The Future of Cinematic Synthesis

Lumina AI Video Pro is a world-class AI video generation platform designed for creators, filmmakers, and business owners. Powered by the latest **Google Gemini Veo** models and **Supabase Cloud**, it offers a seamless pipeline from text-to-cinematic reality. .

---

## 🌟 Key Features

- **🎬 Professional Cinematography**: High-definition video generation using `veo-3.1-fast-generate-preview`.
- **✍️ AI Director Mode**: Auto-refinement of simple prompts into detailed cinematic descriptions using Gemini 3 Pro.
- **☁️ Cloud Vault**: Securely save and sync your projects across devices with Supabase integration.
- **🎙️ AI Narration**: Built-in Text-to-Speech (TTS) to add professional voiceovers to your videos instantly.
- **🔄 Video Extension**: Add 7-second extensions to existing scenes for longer storytelling (Pro feature).
- **🇮🇳 Bilingual UI**: Full support for both English and Hindi languages.
- **💎 Monetization Ready**: Integrated credit system and subscription tiers.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **AI Engine** | Google Gemini API (@google/genai) |
| **Video Models** | Veo 3.1 (Fast & High Quality) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Google OAuth) |
| **Icons** | Lucide React |

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed on your machine.
- A valid Google Gemini API Key.
- A Supabase Project (URL & Anon Key).

### How to get Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project.
3. Once created, go to **Project Settings** (icon at bottom left) > **API**.
4. Copy the **Project URL** (This is your `SUPABASE_URL`).
5. Copy the **anon public** key (This is your `SUPABASE_ANON_KEY`).

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/lumina-ai-video.git
   cd lumina-ai-video
   ```

2. **Setup Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Install & Run:**
   ```bash
   npm install
   npm start
   ```

---

## 📈 Monetization Strategy

Lumina is built for profitability. The current implementation includes:
1. **Credit-Based System**: Each video generation costs 10 credits.
2. **Subscription Tiers**: Code-ready logic for Free, Pro, and Enterprise levels.
3. **Usage Tracking**: Credits are synced with Supabase to prevent abuse and manage billing.

---

## 🗺 Publishing Roadmap

- [x] **Phase 1**: Core UI & Gemini API Integration.
- [x] **Phase 2**: Supabase Cloud Sync & Authentication.
- [ ] **Phase 3**: Stripe/Razorpay Payment Gateway Integration.
- [ ] **Phase 4**: Community Feed & Social Sharing Features.
- [ ] **Phase 5**: Mobile App (React Native) Deployment.

---

## 📄 License & Legal

This project is intended for professional use. Users must adhere to Google's Generative AI Prohibited Use Policy. 

**Developed with ❤️ by Lumina Engineering.**
