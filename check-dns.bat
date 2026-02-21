@echo off
REM DNS Checker Script for plug-hr.com (Windows)

set DOMAIN=plug-hr.com
set WWW_DOMAIN=www.plug-hr.com
set FIREBASE_URL=plug-hr.web.app

echo 🔍 DNS ^& SSL Checker for %DOMAIN%
echo ==================================
echo.

echo 📍 Checking A Records...
echo ------------------------
nslookup %DOMAIN%
echo.

echo 📋 Checking TXT Records (Verification)...
echo ----------------------------------------
nslookup -type=TXT %DOMAIN%
echo.

echo 🌐 Checking CNAME for www...
echo ----------------------------
nslookup %WWW_DOMAIN%
echo.

echo ✅ Domain Resolution Test...
echo ---------------------------
ping -n 1 %DOMAIN% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ %DOMAIN% is reachable
) else (
    echo ❌ %DOMAIN% is not reachable yet
)
echo.

echo 📊 Quick Summary
echo ================
echo Firebase URL: https://%FIREBASE_URL%
echo Custom Domain: https://%DOMAIN%
echo.
echo To check DNS propagation globally:
echo https://dnschecker.org/#A/%DOMAIN%
echo.
echo To check SSL status:
echo https://www.sslshopper.com/ssl-checker.html#hostname=%DOMAIN%
echo.
pause
