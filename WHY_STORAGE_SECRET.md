# 🔐 NEXT_PUBLIC_STORAGE_SECRET - Kyon Zaroori Hai?

## Origin (Kahan Se Aaya)

### 1. Security Audit Ne Issue Identify Kiya
Security audit mein yeh issue mila:
- **Problem:** Prescription data, customer details, aur ID proof **plain text** mein localStorage mein store ho rahe the
- **Risk:** XSS (Cross-Site Scripting) attack mein yeh data easily access ho sakta tha
- **Example:** Agar koi malicious script browser mein run ho, to wo localStorage se directly data read kar sakta tha

### 2. Solution: AES Encryption
- Sensitive data ko **encrypt** karke store karna
- Encryption ke liye ek **secret key** chahiye
- Ye secret key environment variable mein store karte hain

---

## Code Mein Kahan Use Hota Hai

### File: `lib/storage-encryption.ts`

```typescript
// Line 10: Secret key yahan se aata hai
const STORAGE_SECRET = process.env.NEXT_PUBLIC_STORAGE_SECRET || 
  'lenstrack-storage-secret-change-in-production';

// Line 17: Encryption mein use hota hai
export function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, STORAGE_SECRET).toString();
}

// Line 29: Decryption mein use hota hai
export function decryptData(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, STORAGE_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

---

## Kya Data Encrypt Hota Hai?

### 1. Prescription Data (`lenstrack_prescription`)
```typescript
// app/questionnaire/prescription/page.tsx
const { setPrescriptionData } = await import('@/lib/secure-storage');
setPrescriptionData(rx); // Encrypted ho kar store hota hai
```

**Contains:**
- Patient ki power (SPH, CYL, Axis)
- Add power
- PD (Pupillary Distance)
- **Sensitive medical information**

### 2. Customer Details (`lenstrack_customer_details`)
```typescript
// app/questionnaire/customer-details/page.tsx
const { setCustomerDetails } = await import('@/lib/secure-storage');
setCustomerDetails({ name, phone, email }); // Encrypted
```

**Contains:**
- Customer name
- Phone number
- Email address
- **Personal identifiable information (PII)**

### 3. ID Proof (`lenstrack_category_id_proof`)
```typescript
// app/questionnaire/[sessionId]/checkout/[productId]/page.tsx
const { setCategoryIdProof } = await import('@/lib/secure-storage');
setCategoryIdProof({ fileName, fileType, fileSize, data }); // Encrypted
```

**Contains:**
- ID proof file details
- Base64 encoded image data
- **Sensitive document information**

---

## NEXT_PUBLIC_ Prefix Kyon?

### Next.js Environment Variables Rules:
- `NEXT_PUBLIC_` prefix = **Client-side accessible** (browser mein use hota hai)
- Without prefix = **Server-side only** (API routes mein use hota hai)

### Kyon Client-Side Chahiye?
- Encryption/Decryption **browser mein** hota hai
- localStorage operations **client-side** hote hain
- Isliye `NEXT_PUBLIC_` prefix zaroori hai

---

## Agar Secret Set Na Ho To?

### Current Code (Line 10):
```typescript
const STORAGE_SECRET = process.env.NEXT_PUBLIC_STORAGE_SECRET || 
  'lenstrack-storage-secret-change-in-production';
```

### Problem:
- **Development:** Fallback secret use hota hai (OK for testing)
- **Production:** Fallback secret **weak** hai aur **publicly known** hai
- **Security Risk:** Agar koi attacker secret key janta hai, to wo data decrypt kar sakta hai

### Solution:
- Production mein **strong, unique secret** set karo
- Minimum 32 characters (64 recommended)
- Randomly generated (crypto.secureRandomBytes)

---

## Encryption Flow

### Save Data (Encrypt):
```
User Input (Plain Text)
    ↓
JSON.stringify()
    ↓
AES.encrypt(data, NEXT_PUBLIC_STORAGE_SECRET)
    ↓
localStorage.setItem(key, encryptedString)
```

### Load Data (Decrypt):
```
localStorage.getItem(key)
    ↓
AES.decrypt(encryptedString, NEXT_PUBLIC_STORAGE_SECRET)
    ↓
JSON.parse()
    ↓
Use Data (Plain Text)
```

---

## Security Benefits

### ✅ Without Encryption (Old):
```javascript
// XSS Attack Possible:
localStorage.getItem('lenstrack_prescription')
// Returns: {"odSphere": -2.5, "osSphere": -2.0, ...}
// Attacker directly read kar sakta hai!
```

### ✅ With Encryption (New):
```javascript
// XSS Attack:
localStorage.getItem('lenstrack_prescription')
// Returns: "U2FsdGVkX1+..." (encrypted gibberish)
// Attacker ko secret key chahiye decrypt karne ke liye
// Secret key sirf environment variable mein hai (secure)
```

---

## Summary

### Kyon Zaroori:
1. **Security:** Sensitive data ko encrypt karke store karna
2. **XSS Protection:** Even if attacker localStorage access kare, data decrypt nahi kar sakta
3. **Compliance:** Medical aur personal data ke liye encryption best practice hai

### Kya Hota Hai:
- Prescription data → Encrypted
- Customer details → Encrypted  
- ID proof → Encrypted

### Kya Nahi Hota:
- Store code → Not encrypted (non-sensitive)
- Language preference → Not encrypted (non-sensitive)
- Session IDs → Not encrypted (non-sensitive)

---

## Production Setup

```bash
# Generate Secret
npx tsx scripts/generate-secrets.ts

# Set in Vercel/Railway
NEXT_PUBLIC_STORAGE_SECRET=<64-character-hex-string>
```

**⚠️ Important:**
- Production mein **unique secret** use karo
- Development aur Production ke liye **different secrets**
- Secret ko **never commit** karo Git mein
- **Rotate** karo har 90 days mein

---

*Last Updated: 2025-01-23*

