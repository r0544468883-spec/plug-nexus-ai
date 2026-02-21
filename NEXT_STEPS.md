# 🎯 Quick Action Guide - Next Steps

## ✅ What's Done
- Application deployed to Firebase
- Live at: https://plug-hr.web.app

## 🔄 What You Need to Do NOW

### 1. Open Firebase Console
Click here: [Firebase Hosting Console](https://console.firebase.google.com/project/plug-hr/hosting)

### 2. Add Custom Domain
1. Look for "**Add custom domain**" button
2. Click it
3. Enter: `plug-hr.com`
4. Click Continue

### 3. Copy DNS Records
Firebase will show you records like this:

```
TXT Record:
━━━━━━━━━━━━━━━━━━━━━━
Type: TXT
Name: @
Value: firebase=abcdef123456...
TTL: 3600

A Records:
━━━━━━━━━━━━━━━━━━━━━━
Type: A
Name: @
Value: 151.101.1.195
TTL: 300

Type: A  
Name: @
Value: 151.101.65.195
TTL: 300
```

**COPY THESE EXACT VALUES** - don't close the Firebase tab!

### 4. Go to Your Domain Registrar
Where did you buy plug-hr.com?
- GoDaddy → [DNS Management](https://dcc.godaddy.com/domains)
- Namecheap → [Domain List](https://ap.www.namecheap.com/domains/list)
- Google Domains → [My Domains](https://domains.google.com)
- Cloudflare → [DNS](https://dash.cloudflare.com)
- Other → Login to your registrar

### 5. Add DNS Records
In your registrar's DNS settings:

1. **Add TXT Record** (exactly as shown in Firebase):
   - Type: `TXT`
   - Host/Name: `@` or leave empty
   - Value: `firebase=...` (paste from Firebase)
   - TTL: `3600` or `Auto`

2. **Add A Records** (all of them):
   - Type: `A`
   - Host/Name: `@` or leave empty
   - Value: First IP (e.g., `151.101.1.195`)
   - TTL: `300` or `Auto`
   
   Then add another A record with the second IP

3. **Add CNAME for www** (if shown):
   - Type: `CNAME`
   - Host/Name: `www`
   - Value: `plug-hr.web.app` (or as shown)
   - TTL: `3600` or `Auto`

### 6. Save and Wait
- **Save** all DNS changes in your registrar
- Go back to Firebase console
- Firebase will check automatically (refresh the page after a few minutes)
- Wait 5 minutes to 48 hours (usually < 30 minutes)

### 7. Verify It's Working
After DNS propagates:

**Check DNS:**
```bash
# Windows
check-dns.bat

# Mac/Linux
chmod +x check-dns.sh
./check-dns.sh
```

**Or check online:**
- DNS Checker: https://dnschecker.org/#A/plug-hr.com
- SSL Checker: https://www.sslshopper.com/ssl-checker.html#hostname=plug-hr.com

**Visit your site:**
- https://plug-hr.com ← Should work after DNS
- https://www.plug-hr.com ← Should redirect/work

---

## 🆘 Common Issues

### "DNS records not found"
→ Wait longer. DNS takes time to propagate globally.

### "Can't add TXT record"
→ Some registrars call it differently:
- Try "Text Record" or "TXT"
- Host might be "@" or empty or "plug-hr.com"

### "Multiple A records not allowed"
→ This is normal! You should add multiple A records. If your registrar doesn't allow it, use the first IP only.

### "SSL not working"
→ Firebase provisions SSL automatically after DNS verification. Can take 15 min to a few hours AFTER DNS is verified.

---

## 📞 Screenshots Location
Take screenshots of:
1. ✅ Firebase showing the DNS records
2. ✅ Your registrar's DNS settings after adding records
3. ✅ Successful verification in Firebase

---

## ⏱️ Timeline
- **Now**: Add DNS records (~5 minutes)
- **5-30 min**: DNS should propagate
- **30-60 min**: Firebase verifies domain
- **1-2 hours**: SSL certificate issued
- **Done**: https://plug-hr.com is live! 🎉

---

## 🎉 After It's Live
Run this to celebrate:
```bash
curl -I https://plug-hr.com
```

You should see `HTTP/2 200` and the SSL certificate! 🚀
