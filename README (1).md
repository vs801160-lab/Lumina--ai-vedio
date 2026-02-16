
# 🎥 Lumina AI Video Pro
### The Future of Cinematic Synthesis

Lumina AI Video Pro is a world-class AI video generation platform designed for creators, filmmakers, and business owners. Powered by the latest **Google Gemini Veo** models and **Supabase Cloud**, it offers a seamless pipeline from text-to-cinematic reality.

---

## 🚀 Firebase Deployment Guide

Deploying to Firebase is highly recommended for professional production.

### 1. Preparation
Ensure you have the Firebase CLI installed:
```bash
npm install -g firebase-tools
```

### 2. Initialization
If you haven't initialized Firebase in this directory:
```bash
firebase login
firebase init hosting
```
- **Project Setup**: Select your existing Firebase project or create a new one.
- **Public Directory**: Set this to `dist` (crucial for Vite).
- **Configure as SPA**: Set to `Yes`.
- **Automatic Builds**: Set to `No` (unless using GitHub Actions).

### 3. Build & Deploy
Run the optimized production build and push to Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting
```

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **AI Engine** | Google Gemini API (@google/genai) |
| **Video Models** | Veo 3.1 (Fast & High Quality) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Google OAuth) |
| **Payments** | Razorpay SDK |

---

## 🇮🇳 Sign-In Verification (Check List)

If you are wondering if Sign-In is working:
1. **Redirect**: When clicking "SIGN IN", it should redirect to Google.
2. **Post-Redirect**: After success, it returns to the app and shows "Welcome back!".
3. **Indicator**: Look at the top bar in the app - it shows a green dot and your email if logged in.
4. **Cloud Sync**: Videos created while logged in will appear in "Your Vault" even after refreshing.

---

## 📈 Troubleshooting
- **CORS Errors**: Ensure `localhost:3000` and your Firebase domain are added to the "Redirect URLs" in Google Cloud Console (Auth).
- **API Errors**: Ensure your `API_KEY` is from a billing-enabled project for Veo models.

**Developed with ❤️ by Lumina Engineering.**
