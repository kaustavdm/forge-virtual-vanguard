# Section 1: Setup

[← Back to Runbook](./RUNBOOK.md) | [Next: ConversationRelay Setup →](./RUNBOOK_2_CONVERSATION_RELAY.md)

---

## 1.1 Clone Repository and Install Dependencies

Clone the workshop repository and install all dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd forge-virtual-vanguard

# Install dependencies for both workspaces
npm install
```

> [!TIP]
> This project uses **npm workspaces**. Running `npm install` at the root installs dependencies for both `build/` and `final/` directories.

---

## 1.2 Configure Environment Variables

### Create `.env` file

```bash
cp .env.example .env
```

### Create Twilio API Keys

You'll need a Twilio API Key for secure authentication. Follow these steps:

1. Log in to the [Twilio Console](https://1console.twilio.com/)

2. Click your **account name** in the top-right corner

3. Select **"API keys & tokens"** from the main screen (or navigate via **Settings → Accounts → API keys & tokens**)

4. Click **"Create API key"**

5. Configure the key:
   - **API key name**: Enter `Forge Virtual Vanguard` (or any descriptive name)
   - **Key type**: Select **Standard** (sufficient for this workshop)

6. Click **"Create"**

7. **Copy both values immediately**:
   - **SID** (starts with `SK`) - This is your API Key SID
   - **Secret** - Your API Key Secret

> [!CAUTION]
> The **Secret** is only displayed once. If you lose it, you'll need to create a new API key. Copy both values before leaving this page.

8. Check the **"Got it!"** checkbox and click **"Done"**

### Get Your Account SID

Your **Account SID** is always visible on the [Twilio Console dashboard](https://1console.twilio.com/) under **Account Info** (starts with `AC`).

### Fill in `.env` file

Edit the `.env` file and add your credentials:

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-...

# Optional: Model override (defaults to gpt-5-mini)
MODEL=gpt-5-mini

# Optional: Server port (defaults to 3000)
PORT=3000

# Leave blank for now - we'll set this in Section 5
TWILIO_INTELLIGENCE_SERVICE_SID=
```

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID (starts with `AC`) | ✅ Yes |
| `TWILIO_API_KEY_SID` | Your API Key SID (starts with `SK`) | ✅ Yes |
| `TWILIO_API_KEY_SECRET` | Your API Key Secret | ✅ Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ Yes |
| `MODEL` | OpenAI model name | Optional (defaults to `gpt-5-mini`) |
| `PORT` | Server port | Optional (defaults to `3000`) |
| `TWILIO_INTELLIGENCE_SERVICE_SID` | Intelligence Service SID | No (set in Section 5) |

---

## 1.3 Set Up ngrok

ngrok creates a public URL that tunnels traffic to your local server. Twilio needs this to reach your machine.

### Install ngrok

If you don't have ngrok installed:

**macOS (Homebrew)**:
```bash
brew install ngrok
```

**Linux / Manual install**:
1. Download from [ngrok.com/download](https://ngrok.com/download)
2. Unzip and move to your `PATH`: `sudo mv ngrok /usr/local/bin`

**Windows**:
1. Download from [ngrok.com/download](https://ngrok.com/download)
2. Extract and add to your PATH

### Authenticate ngrok

1. Sign up for a free account at [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Copy your **Authtoken** from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Authenticate:

```bash
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

### Start ngrok

In a **separate terminal** (keep it running for the entire workshop):

```bash
ngrok http 3000
```

You should see output like:

```
Session Status                online
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000
```

**📝 Note your Forwarding URL**: `https://abc123.ngrok-free.app`

You'll need this URL in Section 2 to configure your Twilio phone number.

> [!IMPORTANT]
> **ngrok URL changes on restart**: The free plan generates a new URL each time you restart ngrok. If you restart ngrok during the workshop, update the webhook URL on your Twilio phone number (Section 2.2).

> [!TIP]
> **Keep ngrok running**: Don't close this terminal window. ngrok must stay running for Twilio to reach your server.

---

## 1.4 Set Up Twilio Dev Phone (Optional)

The [Twilio Dev Phone](https://www.twilio.com/docs/labs/dev-phone) lets you make and receive calls from your browser without using your personal phone.

> [!CAUTION]
> **Dev Phone overwrites webhooks**: The Dev Phone temporarily changes webhook configuration on the phone number it uses. Don't use it with a production number. Use a separate test number or disable Dev Phone when testing the main agent.

### Install Twilio CLI

If you don't have the Twilio CLI:

**macOS (Homebrew)**:
```bash
brew tap twilio/brew && brew install twilio
```

**npm (all platforms)**:
```bash
npm install -g twilio-cli
```

### Log in to Twilio CLI

```bash
twilio login
```

Enter your **Account SID**, **API Key SID**, and **API Key Secret** when prompted.

### Install Dev Phone Plugin

```bash
twilio plugins:install @twilio-labs/plugin-dev-phone
```

### Start Dev Phone

```bash
twilio dev-phone
```

This will:
1. Set up required Twilio services (Conversations, Sync, Serverless)
2. Open a browser tab at `http://localhost:3001/` with a dial pad
3. Assign a Twilio phone number for testing

**To make a call**: Enter a destination number in the Dev Phone UI and click **Call**.

**To receive calls**: Dial the Dev Phone's assigned number from any phone.

When you're done, press `Ctrl+C` in the terminal. Dev Phone automatically cleans up resources.

> [!NOTE]
> Dev Phone runs on port 3001 by default, so it won't conflict with your server on port 3000.

---

## 1.5 Start the Server

Start the server from the `build/` directory:

```bash
npm start
```

You should see output like:

```
Server listening on http://0.0.0.0:3000
```

### Verify Server is Running

Open a browser or use curl to check the health endpoint:

**Browser**: [http://localhost:3000/health](http://localhost:3000/health)

**curl**:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok"}
```

> [!TIP]
> **Testing with ngrok**: Verify ngrok is forwarding traffic:
> ```bash
> curl https://<your-ngrok-url>.ngrok-free.app/health
> ```
> You should see the same response.


---

← [Back to Runbook](./RUNBOOK.md) | [Next: ConversationRelay Setup →](./RUNBOOK_2_CONVERSATION_RELAY.md)
