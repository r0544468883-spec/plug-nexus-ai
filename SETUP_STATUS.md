# ✅ Deployment Checklist - plug-hr.com

## Status: 🟢 Application Deployed to Firebase

### ✅ Completed
- [x] GCP Project created (`plug-hr`)
- [x] Firebase added to project
- [x] Application built successfully
- [x] Deployed to Firebase Hosting
- [x] Live at: https://plug-hr.web.app

### 🔄 In Progress - Custom Domain Setup

#### Step 1: Access Firebase Console
```
https://console.firebase.google.com/project/plug-hr/hosting
```

#### Step 2: Add Custom Domain
1. Click **"Add custom domain"**
2. Enter domain: `plug-hr.com`
3. (Optional) Add: `www.plug-hr.com`

#### Step 3: DNS Configuration
Firebase will provide these records - **copy them exactly**:

**TXT Record (Verification):**
```
Type: TXT
Host/Name: @
Value: [PROVIDED BY FIREBASE CONSOLE]
TTL: 3600
```

**A Records (IPv4):**
```
Type: A
Host/Name: @
Value: [IP ADDRESS FROM FIREBASE]
TTL: 300
```

**AAAA Records (IPv6 - if provided):**
```
Type: AAAA
Host/Name: @
Value: [IPv6 ADDRESS FROM FIREBASE]
TTL: 300
```

**CNAME for www (if applicable):**
```
Type: CNAME
Host/Name: www
Value: [TARGET FROM FIREBASE]
TTL: 300
```

#### Step 4: Where to Add DNS Records
- Go to your domain registrar (GoDaddy, Namecheap, etc.)
- Find DNS Management / DNS Settings
- Add the records provided by Firebase
- Save changes

#### Step 5: Wait for Verification
- DNS propagation: 5 minutes to 48 hours (usually < 1 hour)
- Firebase will verify ownership automatically
- SSL certificate will be issued automatically (free)

#### Step 6: Verification
After DNS propagation:
- Visit: https://plug-hr.com
- Check SSL (green padlock in browser)
- Test SPA routing (navigate to different pages)

---

## 🚀 Future Deployments

### Quick Deploy (Windows):
```bash
deploy.bat
```

### Quick Deploy (Mac/Linux):
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Deploy:
```bash
npm run build
firebase deploy --only hosting
```

### Using npm script:
```bash
npm run deploy
```

---

## 📊 Monitoring & Analytics

### View Deployment Status:
```bash
firebase hosting:releases:list
```

### Firebase Console:
- Hosting: https://console.firebase.google.com/project/plug-hr/hosting
- Analytics: https://console.firebase.google.com/project/plug-hr/analytics

### Performance:
- Lighthouse: Test at https://pagespeed.web.dev/
- Firebase Performance: Enable in console

---

## 💰 Cost Monitoring

### Current Setup:
- **Hosting**: Free tier (generous limits)
- **SSL**: Free (managed by Firebase)
- **CDN**: Included

### Expected Monthly Cost:
- **Low traffic** (< 10GB): $0
- **Medium traffic** (10-50GB): $1.50-$10
- **High traffic** (50-100GB): $10-$20

### Monitor Usage:
https://console.cloud.google.com/billing/plug-hr

---

## 🔧 Troubleshooting

### Domain not connecting:
1. Verify DNS records are exact copies from Firebase
2. Check DNS propagation: https://dnschecker.org
3. Wait up to 48 hours (usually much faster)

### SSL not working:
- Firebase provisions SSL automatically after DNS verification
- Can take 15 minutes to a few hours after DNS is verified

### 404 on refresh:
- Already configured in `firebase.json` (SPA rewrite)
- If issue persists, check that rewrites are in firebase.json

### Build fails:
```bash
rm -rf node_modules dist
npm install
npm run build
```

---

## 📱 Next Steps (Optional)

### Backend Integration:
- [ ] Deploy Cloud Functions for API endpoints
- [ ] Configure `/api/*` rewrites in firebase.json
- [ ] Set up CORS for Supabase integration

### Performance Optimization:
- [ ] Enable Firebase Performance Monitoring
- [ ] Add Google Analytics
- [ ] Configure Lighthouse CI

### Security:
- [ ] Review security headers (already configured)
- [ ] Set up Firebase App Check
- [ ] Configure CSP headers if needed

### CI/CD:
- [ ] Set up GitHub Actions (if needed)
- [ ] Configure staging environment
- [ ] Add automated testing before deploy

---

## 📞 Support

### Firebase Documentation:
- Hosting: https://firebase.google.com/docs/hosting
- Custom domains: https://firebase.google.com/docs/hosting/custom-domain

### Useful Commands:
```bash
# Check current project
firebase use

# List all projects
firebase projects:list

# View hosting URL
firebase hosting:sites:list

# Rollback (via console only)
# Go to: Hosting > Release history
```
