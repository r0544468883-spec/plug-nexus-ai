@echo off
echo 🚀 Deploying plug-nexus-ai to Firebase Hosting...
echo.

REM Check if .env exists
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and configure your environment variables.
    exit /b 1
)

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI is not installed!
    echo Run: npm install -g firebase-tools
    exit /b 1
)

echo ✅ Environment checks passed
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm ci

REM Build the project
echo 🔨 Building project...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed!
    exit /b 1
)

echo ✅ Build successful
echo.

REM Deploy to Firebase
echo 🚀 Deploying to Firebase Hosting...
call firebase deploy --only hosting

if %errorlevel% equ 0 (
    echo.
    echo ✅ Deployment successful!
    echo 🌐 Your app is live at: https://plug-hr.web.app
) else (
    echo.
    echo ❌ Deployment failed!
    exit /b 1
)
