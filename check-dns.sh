#!/bin/bash

# DNS Checker Script for plug-hr.com
# This script checks DNS propagation and SSL status

DOMAIN="plug-hr.com"
WWW_DOMAIN="www.plug-hr.com"
FIREBASE_URL="plug-hr.web.app"

echo "🔍 DNS & SSL Checker for $DOMAIN"
echo "=================================="
echo ""

# Check if dig is available
if ! command -v dig &> /dev/null; then
    echo "⚠️  'dig' command not found. Install dnsutils (Linux) or use nslookup (Windows)"
    echo ""
fi

# Check A records
echo "📍 Checking A Records..."
echo "------------------------"
if command -v dig &> /dev/null; then
    dig +short A $DOMAIN
    echo ""
else
    nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -n +2
    echo ""
fi

# Check AAAA records (IPv6)
echo "📍 Checking AAAA Records (IPv6)..."
echo "----------------------------------"
if command -v dig &> /dev/null; then
    dig +short AAAA $DOMAIN
    echo ""
else
    echo "Use nslookup -type=AAAA $DOMAIN on Windows"
    echo ""
fi

# Check TXT records
echo "📋 Checking TXT Records (Verification)..."
echo "----------------------------------------"
if command -v dig &> /dev/null; then
    dig +short TXT $DOMAIN
    echo ""
else
    echo "Use nslookup -type=TXT $DOMAIN on Windows"
    echo ""
fi

# Check CNAME for www
echo "🌐 Checking CNAME for www..."
echo "----------------------------"
if command -v dig &> /dev/null; then
    dig +short CNAME $WWW_DOMAIN
    echo ""
else
    nslookup $WWW_DOMAIN 2>/dev/null | grep "canonical name"
    echo ""
fi

# Check if domain resolves
echo "✅ Domain Resolution Test..."
echo "---------------------------"
if ping -c 1 $DOMAIN &> /dev/null; then
    echo "✅ $DOMAIN is reachable"
else
    echo "❌ $DOMAIN is not reachable yet"
fi
echo ""

# Check SSL
echo "🔒 SSL Certificate Check..."
echo "--------------------------"
if command -v curl &> /dev/null; then
    SSL_INFO=$(curl -vI https://$DOMAIN 2>&1 | grep -E "SSL certificate|subject|issuer" || echo "Not available yet")
    echo "$SSL_INFO"
else
    echo "curl not available. Check manually at: https://www.sslshopper.com/ssl-checker.html#hostname=$DOMAIN"
fi
echo ""

# Check HTTP response
echo "🌐 HTTP Response Check..."
echo "------------------------"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $DOMAIN returns HTTP $HTTP_CODE"
    else
        echo "⚠️  $DOMAIN returns HTTP $HTTP_CODE (or not reachable)"
    fi
else
    echo "curl not available"
fi
echo ""

# Summary
echo "📊 Quick Summary"
echo "================"
echo "Firebase URL: https://$FIREBASE_URL"
echo "Custom Domain: https://$DOMAIN"
echo ""
echo "To check DNS propagation globally:"
echo "https://dnschecker.org/#A/$DOMAIN"
echo ""
echo "To check SSL status:"
echo "https://www.sslshopper.com/ssl-checker.html#hostname=$DOMAIN"
