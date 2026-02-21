# Plug Nexus AI - HR Platform

[![Deployed on Firebase](https://img.shields.io/badge/Firebase-Hosting-orange?logo=firebase)](https://plug-hr.web.app)
[![Built with Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)

Modern HR platform built with React, TypeScript, and Supabase.

## 🚀 Live Application

- **Production**: https://plug-hr.web.app
- **Custom Domain**: https://plug-hr.com (pending DNS setup)

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [Environment Setup](#environment-setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI (for deployment)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/r0544468883-spec/plug-nexus-ai.git
cd plug-nexus-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## 🛠️ Development

### Running Locally

```bash
# Start dev server with hot reload
npm run dev

# Run tests
npm run test

# Watch mode for tests
npm run test:watch

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment

### Current Setup
- **Platform**: Firebase Hosting
- **Project ID**: `plug-hr`
- **Region**: Global CDN

### Quick Deploy

#### Windows:
```bash
deploy.bat
```

#### Mac/Linux:
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Or manually:
```bash
npm run deploy
```

### First-Time Setup

1. **Install Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Deploy**:
```bash
npm run build
firebase deploy --only hosting
```

### Custom Domain Setup

See [SETUP_STATUS.md](SETUP_STATUS.md) for detailed DNS configuration steps.

**Quick summary:**
1. Go to [Firebase Console - Hosting](https://console.firebase.google.com/project/plug-hr/hosting)
2. Click "Add custom domain"
3. Enter `plug-hr.com`
4. Add DNS records shown by Firebase to your domain registrar
5. Wait for verification (5 min - 48 hours)

## 🔐 Environment Setup

### Required Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon/Public key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Project reference → `VITE_SUPABASE_PROJECT_ID`

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run deploy` | Build and deploy to Firebase |
| `npm run deploy:preview` | Deploy to preview channel |
| `npm run lint` | Lint code with ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## 📁 Project Structure

```
plug-nexus-ai/
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # Shadcn UI components
│   │   ├── chat/      # Chat functionality
│   │   ├── jobs/      # Job-related components
│   │   └── ...
│   ├── contexts/      # React contexts (Auth, Credits, Language)
│   ├── hooks/         # Custom React hooks
│   ├── integrations/  # External integrations (Supabase)
│   ├── lib/           # Utilities and helpers
│   ├── pages/         # Page components
│   └── assets/        # Static assets
├── public/            # Public static files
├── supabase/          # Supabase functions and migrations
├── dist/              # Production build (generated)
├── firebase.json      # Firebase configuration
├── .firebaserc        # Firebase project config
├── vite.config.ts     # Vite configuration
└── package.json       # Dependencies and scripts
```

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **State Management**: React Query, Context API
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Build Tool**: Vite
- **Hosting**: Firebase Hosting
- **Testing**: Vitest, Testing Library

## 🔒 Security Headers

Already configured in `firebase.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`

## 📊 Performance

- Global CDN via Firebase
- Static assets cached for 1 year
- Gzip compression enabled
- Code splitting with Vite

### Optimization Tips

```bash
# Analyze bundle size
npm run build -- --mode production

# Check with Lighthouse
npx lighthouse https://plug-hr.web.app
```

## 🐛 Troubleshooting

### Build Issues

```bash
# Clean install
rm -rf node_modules dist
npm install
npm run build
```

### Deployment Issues

```bash
# Re-authenticate
firebase login --reauth

# Check project
firebase use plug-hr

# Try deploying again
npm run deploy
```

### Environment Variables Not Working

- Make sure `.env` file exists
- Prefix all variables with `VITE_`
- Restart dev server after changing .env

## 📚 Documentation

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Deployment Guide](DEPLOYMENT.md)
- [Setup Status](SETUP_STATUS.md)

## 💰 Cost Estimates

### Firebase Hosting
- **Free Tier**: 10GB storage, 360MB/day bandwidth
- **Estimated Cost**: $0-10/month for typical usage
- **SSL**: Free (auto-managed)
- **CDN**: Included

### Monitoring Costs
Check usage at: https://console.cloud.google.com/billing/plug-hr

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## 📄 License

Private project - All rights reserved

## 📞 Support

- Firebase Console: https://console.firebase.google.com/project/plug-hr
- Supabase Dashboard: https://supabase.com/dashboard
- GCP Console: https://console.cloud.google.com/welcome?project=plug-hr

---

**Last Updated**: February 14, 2026
**Version**: 1.0.0
**Status**: ✅ Deployed to Firebase Hosting
