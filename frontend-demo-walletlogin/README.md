# TiX-One zkLogin Wallet Demo

Web2-style login flow using Google OAuth + zkLogin to generate Sui wallet addresses.

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend-demo-walletlogin
npm install
```

### 2. Get Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Navigate to: **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `http://localhost:3000/auth/callback`
7. Copy the Client ID

### 3. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and add your Google Client ID:
```
REACT_APP_GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com
REACT_APP_REDIRECT_URI=http://localhost:3000/auth/callback
REACT_APP_SUI_NETWORK=testnet
```

### 4. Run the App

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## How It Works

1. **User clicks "Login with Google"**
   - App generates ephemeral keypair
   - Redirects to Google OAuth

2. **Google returns JWT token**
   - App fetches user salt from Mysten service
   - Derives Sui address from JWT + salt

3. **User sees their wallet**
   - Email displayed
   - Sui address shown
   - Session persisted

## Architecture

```
src/
├── App.js              # Main component with 3 states
├── App.css             # Styling with animations
├── utils/
│   └── zkLoginHelper.js  # zkLogin utilities
└── index.js            # React entry point
```

## Features

- ✅ Google OAuth login
- ✅ Automatic Sui wallet generation
- ✅ Session persistence
- ✅ Beautiful, responsive UI
- ✅ Loading states
- ✅ Error handling
- ✅ Testnet configuration

## Next Steps

- Connect to TiX-One smart contract
- Implement ticket purchasing
- Display owned tickets
- Enable marketplace trading

## Troubleshooting

**"Please configure your Google OAuth Client ID"**
- Make sure `.env` file exists
- Verify `REACT_APP_GOOGLE_CLIENT_ID` is set
- Restart the dev server after changing `.env`

**OAuth redirect fails**
- Check redirect URI in Google Console matches exactly
- Must be `http://localhost:3000/auth/callback`

**"Failed to fetch user salt"**
- Check network connection
- Verify Mysten salt service is accessible
- Check browser console for errors
