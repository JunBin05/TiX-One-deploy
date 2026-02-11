# Alternative: Simple HTML Version (No Build Required)

If you're having npm install issues, use this **zero-build** approach:

## Quick Setup

```bash
cd ~/TiX-One
mkdir zklogin-simple
cd zklogin-simple
```

Create `index.html` and `zklogin.js` below, then:

```bash
python3 -m http.server 3000
# OR
npx serve .
```

Open: **http://localhost:3000**

This uses CDN imports - no npm, no build step needed!

---

**For the React version**: The issue is Windows/WSL path conflicts with npm. 

**Recommended solution**: Use **Windows PowerShell natively** OR **WSL native Node.js**:

### Option A: Install Node in Windows
```powershell
# Download and install Node.js for Windows from nodejs.org
# Then run from  regular cmd/powershell (not WSL path):
cd C:\Users\User\Projects\TiX-One\frontend
npm install
npm run dev
```

### Option B: Use WSL Node properly
```bash
# Inside WSL terminal (not PowerShell):
cd ~/TiX-One/frontend-demo-walletlogin
npm install --legacy-peer-deps
npm run dev
```

The key is **don't mix Windows npm with WSL paths**.
