# 🔑 Secret Key Access - Simple Setup

## ✅ **Setup Complete!**

### 🎯 **Kya Hua:**

1. **Base URL Redirect** ✅
   - `https://yoursite.com/` → Auto-redirect to questionnaire
   - No need for `/questionnaire` in URL

2. **Secret Key Access** ✅
   - Secret key se direct access without store code
   - URL mein key add karo, auto-login

---

## 🔐 **Your Secret Key:**

```
LENSTRACK2025
```

**⚠️ Important:** Yeh key secret rakho! Sirf trusted log ko do.

---

## 🚀 **Kaise Use Karein:**

### **Option 1: Simple URL (Public)**
```
https://yoursite.com/
```
- Customer ko store code dalna padega
- Public access

### **Option 2: Secret Key URL (Staff Only)**
```
https://yoursite.com/questionnaire?key=LENSTRACK2025
```
- ✅ **Auto-bypass store code**
- ✅ **Direct questionnaire access**
- ✅ **Default store (MAIN-001) use hoga**

---

## 📱 **Share Kaise Karein:**

### **Customers Ke Liye:**
```
Visit: yoursite.com
```
(Wo store code dalenge)

### **Staff/Trusted Ke Liye:**
```
Direct Link: yoursite.com/questionnaire?key=LENSTRACK2025
```
(No store code needed!)

---

## 🎨 **Kya Hoga:**

### **Without Key:**
1. Site kholo → Store code screen
2. Code dalo (MAIN-001 etc.)
3. Continue
4. Questionnaire start

### **With Secret Key:**
1. Link open karo with `?key=LENSTRACK2025`
2. ✅ **Direct questionnaire** (no store code!)
3. Default store auto-select
4. Start immediately!

---

## 🔧 **Technical Details:**

**Secret Key:** `LENSTRACK2025`  
**Default Store:** `MAIN-001` (Main Store - Mumbai)  
**Env Variable:** `NEXT_PUBLIC_QUESTIONNAIRE_SECRET_KEY`

---

## 🛡️ **Security:**

- ✅ Key ko secret rakho
- ✅ Sirf trusted people ko share karo
- ✅ Public links mein key mat do
- ✅ Agar compromise ho jaye, env file mein change karo

---

## 📝 **Key Change Karna Hai?**

File: `.env.local`
```env
NEXT_PUBLIC_QUESTIONNAIRE_SECRET_KEY=YOUR_NEW_KEY
```

Save karo aur server restart:
```bash
npm run dev
```

---

## 🎯 **Examples:**

### **Public Share:**
```
WhatsApp: Visit yoursite.com and enter store code MAIN-001
```

### **Staff Share:**
```
Direct Link (Staff Only): 
yoursite.com/questionnaire?key=LENSTRACK2025
```

### **Social Media:**
```
🔗 yoursite.com
📱 Enter your store code to get started!
```

---

## ✅ **Testing:**

### **Test 1: Base URL**
```
http://localhost:3000/
```
Should redirect to questionnaire with store code screen

### **Test 2: With Secret Key**
```
http://localhost:3000/questionnaire?key=LENSTRACK2025
```
Should bypass store code and go direct to category selection!

### **Test 3: Wrong Key**
```
http://localhost:3000/questionnaire?key=WRONG
```
Should show store code screen (key ignored)

---

## 🎉 **Summary:**

**Base URL:** `yoursite.com` → Auto-redirect to questionnaire  
**Secret Key:** `LENSTRACK2025` → Direct access  
**Public Access:** Store code required  
**Staff Access:** Use secret key link

**Ab aap easily share kar sakte ho!** 🚀

---

**Created:** December 6, 2025  
**Status:** ✅ **LIVE**

