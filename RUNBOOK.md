# Forge Virtual Vanguard – Voice AI Agent Runbook

- **Project:** Voice AI Agent with ConversationRelay & Conversational Intelligence
- **Focus:** Building an Observable, Production-Grade Voice AI Agent
- **Tech Stack:** Node.js 24 (Fastify), Twilio ConversationRelay, Twilio Conversational Intelligence, OpenAI GPT-5 mini
- **Duration:** ~75 min to build
- **Outcome:** A working voice AI agent for Signal City Transit that handles route inquiries, lost item reports, and human escalation — with post-call intelligence analysis

---

## What You'll Learn

- How to set up Twilio ConversationRelay to bridge phone calls with a WebSocket server
- How to handle real-time WebSocket messages (speech, interrupts, DTMF)
- How to integrate an LLM with function calling for voice conversations (streaming is pre-built)
- How to use Twilio Conversational Intelligence for post-call analysis
- How to create custom operators and receive analysis results via webhook

## Prerequisites

- **Node.js 24** (LTS version recommended)
- **Twilio Account**, upgraded and active, with a Voice-enabled phone number
- **OpenAI API key** with GPT-5 mini access.
- **Basic knowledge:** JavaScript/Node.js, HTTP APIs, WebSockets
- **VS Code** Any editor will do but we will be using this one on a mac
- - **ngrok** installed and authenticated ([download](https://ngrok.com/download))

## Prerequisites We Will Walkthrough
- **Twilio Dev Phone** (optional but recommended) — browser-based calling for testing without a cell phone ([docs](https://www.twilio.com/docs/labs/dev-phone))

---

## Build

### 1. Setup

#### 1. 1 Create a folder for this workshop

```bash
mkdir signal_workshop
cd signal_workshop
```

#### 1.2 Clone repo and install dependencies

```bash
# Clone the repository
git clone https://github.com/kaustavdm/forge-virtual-vanguard/
cd forge-virtual-vanguard

# Install dependencies
npm install
```

> [!TIP]
> This project uses npm workspaces. Running `npm install` in the root directory installs dependencies for both `build/` and `final/` directories.

#### 1.3 Configure environment variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

**Create Twilio API keys:**

If you don't have Twilio credentials already, follow these steps to create a new Twilio API key:

1. Log in to your [Twilio Console](https://1console.twilio.com/)
2. In the top-right corner, click your **account name** to open the account menu
3. Select **"API keys & tokens"** from main screen (or navigate to **Settings → Accounts → API keys & tokens** in the left sidebar)
4. On the API keys page, click the **"Create API key"** button
5. Fill in the key details:
   - **API key name :** Enter a descriptive name (e.g., "Forge Virtual Vanguard") — this helps you identify the key later
   - **Key type:** Select **Standard** (this is sufficient for our use case; Main keys have broader account-level permissions)
6. Click **"Create"**
7. You'll see a confirmation screen with two values:
   - **SID** — This is your API Key SID (starts with `SK`). Copy it now.
   - **Secret** — This is your API Key Secret. Copy it now.

> [!CAUTION]
> The **Secret** is only displayed once on this screen. If you lose it, you'll need to create a new API key. Copy both the SID and Secret and store them somewhere safe before leaving this page.

8. Check the **"Got it!"** acknowledgement checkbox and click **"Done"**

You'll also need your **Account SID**, which is always visible on the [Twilio Console dashboard](https://1console.twilio.com/) under **Account Info** (starts with `AC`).

**Fill in your credentials:**

Edit the `.env` file created in the step above and fill in the details:

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_API_KEY_SID` | Your Twilio API Key SID | `SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_API_KEY_SECRET` | Your Twilio API Key Secret | `your-secret-key` |
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `PORT` | Server port (default 3000) | `3000` |

> [!NOTE]
> Leave `TWILIO_INTELLIGENCE_SERVICE_SID` blank for now. We'll set it up in Section 5.

#### 1.4 Review bootstrap code

Take a moment to explore the [`./build/`](./build/) directory structure:

- [`build/server.js`](./build/server.js) — Fastify server (pre-configured, no edits needed)
- [`build/services/transit-data.js`](./build/services/transit-data.js) — Transit data helpers (pre-built)
- [`build/services/llm.js`](./build/services/llm.js) — LLM integration (streaming is pre-built; you'll add the system prompt, tools, and tool execution)
- [`build/routes/twiml.js`](./build/routes/twiml.js) — TwiML route (we'll implement this)
- [`build/routes/websocket.js`](./build/routes/websocket.js) — WebSocket handler (we'll implement this)
- [`build/routes/intelligence.js`](./build/routes/intelligence.js) — Intelligence webhook (we'll implement this)
- [`assets/routes.json`](./assets/routes.json) — Signal City Transit route data (shared)

#### 1.5 Set up ngrok

ngrok creates a public URL that tunnels traffic to your local server, which is required for Twilio to reach your machine.

**Install ngrok:**

If you don't have ngrok installed yet:

1. Go to [ngrok.com/download](https://ngrok.com/download) and download the version for your OS
2. **macOS (Homebrew):**
   ```bash
   brew install ngrok
   ```
   **Linux / manual install:** Unzip the download and move the binary to a directory in your `PATH` (e.g., `/usr/local/bin`)
3. **Sign up** for a free ngrok account at [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) if you don't have one
4. Copy your **Authtoken** from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
5. Authenticate your local install:
   ```bash
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```

**Start ngrok:**

In a separate terminal (keep it running for the duration of the workshop):

```bash
ngrok http 3000
```

You should see output like:

```
Session Status                online
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000
```

Note your **Forwarding URL** (e.g., `https://abc123.ngrok-free.app`). You'll need this for configuring your Twilio phone number.

> [!TIP]
> The ngrok URL changes every time you restart ngrok (on the free plan). If you restart ngrok, you'll need to update the webhook URL on your Twilio phone number in Section 2.2.

#### 1.6 Set up Twilio Dev Phone (optional)

The [Twilio Dev Phone](https://www.twilio.com/docs/labs/dev-phone) lets you make and receive calls from your browser — no personal cell phone needed. This is useful if you don't have cell service, your phone isn't nearby, or you want to keep testing entirely on your computer.

> [!CAUTION]
> The Dev Phone **overwrites the webhooks** on the phone number it uses. Do not use it with a phone number that's already configured for production traffic. Use a separate Twilio phone number for the Dev Phone, or use it only when you're not testing the main agent.

**Install the Twilio CLI** (if you don't have it):

```bash
# macOS (Homebrew)
brew tap twilio/brew && brew install twilio

# npm (all platforms)
npm install -g twilio-cli
```

**Log in to the CLI:**

```bash
twilio login
```

Enter your Account SID, API Key SID, and API Key Secret when prompted.

**Install the Dev Phone plugin:**

```bash
twilio plugins:install @twilio-labs/plugin-dev-phone
```

**Start the Dev Phone:**

```bash
twilio dev-phone
```

This will:
1. Set up the required Twilio services (Conversations, Sync, Serverless, TwiML App)
2. Open a browser tab at `http://localhost:3001/` with a dial pad
3. Assign a Twilio phone number you can use to make and receive calls

To make a call, enter a destination number in the Dev Phone UI and click **Call**. To receive calls, dial the Dev Phone's assigned number from any phone.

When you're done, press `Ctrl+C` in the terminal — the Dev Phone automatically cleans up the resources it created.

> [!NOTE]
> The Dev Phone runs on port 3001 by default, so it won't conflict with your server on port 3000.

#### 1.7 Start the server

```bash
npm start
```

> [!NOTE]
> This will start the server from the `build/` directory.
> If you want to test the `final/` code instead, run `npm run start:final`

```bash
node build/server.js | jq
```

> [!NOTE]
> You can run ths command and it will provide prettier logs and can be used instead of `npm run start`.

Verify the server starts by checking the health endpoint: `http://localhost:3000/health`

✅ **Setup done.**

---

### 2. ConversationRelay Setup

In this section, you'll configure Twilio ConversationRelay to bridge phone calls with your local server via WebSocket.

> [!NOTE]
> Production applications should implement websocket security with signature validation.
> We will skip that for this workshop.
> See [Twilio webhook security docs](https://www.twilio.com/docs/usage/webhooks/webhooks-security) for details.

#### 2.1 Enable ConversationRelay

ConversationRelay requires the AI Features Addendum to be accepted on your Twilio account.

1. Go to the [Twilio Console](https://1console.twilio.com/)
2. Navigate to **Products & Services → Voice → Settings → Privacy & security**
3. Turn on the **Predictive and Generative AI/ML Features Addendum**

> [!IMPORTANT]
> This step is required before ConversationRelay will work. See the [onboarding docs](https://www.twilio.com/docs/voice/conversationrelay/onboarding) for details.

#### 2.2 Configure phone number webhook

1. In the Twilio Console, go to **Numbers and senders → Phone Numbers → Inventory** or you can serach it in the upper right. 
2. Select the phone number you want to use or buy one. 
3. Go to **Configure Details** tab.
3. Under **Voice Configuration**, set:
    - **Edit details:** "Webhook, TwiML Bin, Function, Studio Flow, Proxy Service"
    - **A call comes in:** Webhook
    - **URL:** `{your_ngrok_url}/twiml` (e.g., `https://abc123.ngrok-free.app/twiml`)
    - **HTTP Method:** POST
4. Click **Save**

#### 2.3 Implement TwiML route

Open `build/routes/twiml.js`. The route scaffolding is already in place — both `/twiml` and `/transfer` routes are registered with the host and intelligence SID extracted. You just need to replace the placeholder `<Say>` TwiML with the correct XML.

> [!IMPORTANT]
> **Your task:** Replace the placeholder TwiML in both routes with the correct XML.

**For the `/twiml` route — key points:**

- Use `<Connect action="/transfer" method="POST">` as the wrapper — `action="/transfer"` tells Twilio where to POST when the ConversationRelay session ends (e.g., after a human transfer)
- Inside `<Connect>`, add a self-closing `<ConversationRelay ... />` noun with:
  - `url` — the WebSocket URL using `host`: `wss://${host}/ws`
  - `welcomeGreeting` — use the `WELCOME_GREETING` constant
  - `ttsProvider="ElevenLabs"` and `language="en-US"`
  - If `intelligenceServiceSid` is set, add `intelligenceService="${intelligenceServiceSid}"`

**For the `/transfer` route:**

- Return `<Play loop="1">https://demo.twilio.com/docs/classic.mp3</Play>` — this plays hold music when a human transfer occurs

> [!TIP]
> See the [ConversationRelay noun docs](https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun) for all available attributes.

<details>
<summary>💡 Click to see the solution</summary>

Replace the `/twiml` route's TwiML:

```javascript
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect action="/transfer" method="POST">
    <ConversationRelay
        url="wss://${host}/ws"
        welcomeGreeting="${WELCOME_GREETING}"
        ttsProvider="ElevenLabs"
        language="en-US"
        ${intelligenceServiceSid ? `intelligenceService="${intelligenceServiceSid}"` : ""} />
  </Connect>
</Response>`;
```

Replace the `/transfer` route's TwiML:

```javascript
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="1">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;
```

</details>

#### 2.4 Test ConversationRelay connection

1. Restart your server: `npm start`

<[!NOTE]
<If your server errors out when you try running it. You'll need to run this command and try again

`lsof -ti:3000 | xargs kill -9`


2. Call your Twilio phone number
3. You should hear the welcome greeting: _"Hello! You've reached Signal City Transit..."_
4. Check your server logs — you should see a WebSocket connection being established

> [!NOTE]
> At this point the agent won't respond to what you say — we haven't implemented the WebSocket message handling yet. But hearing the greeting confirms ConversationRelay is working.

- [ ] Server starts without errors
- [ ] Calling the phone number plays the welcome greeting
- [ ] Server logs show WebSocket connection established

✅ ConversationRelay connected.

---

### 3. WebSocket Message Handling

Now let's handle the messages that ConversationRelay sends over the WebSocket. Open `build/routes/websocket.js` — the route skeleton is there with a `sessions` Map and switch/case structure, but the handlers are empty TODOs.

> [!TIP]
> ConversationRelay sends these message types over WebSocket:
> - **`setup`** — Sent once when the connection opens. Contains call metadata.
> - **`prompt`** — Sent when the caller finishes speaking. Contains transcribed text.
> - **`interrupt`** — Sent when the caller speaks while TTS is playing.
> - **`dtmf`** — Sent when the caller presses a key.
> - **`error`** — Sent when an error occurs.
>
> See the [WebSocket messages docs](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages) for full details.

#### 3.1 Handle the `setup` message

The `setup` message arrives once when the WebSocket connects. It contains call metadata like `callSid`, `from`, and `to`.

> [!IMPORTANT]
> **Your task:** Initialize the session in the `sessions` Map and log the call details.

**Key implementation points:**

- Extract `callSid` from the message
- Create a new session object `{ conversationHistory: [], abortController: null }` in the `sessions` Map
- Store `callSid` on the socket (`socket.callSid = callSid`) for later lookup in other handlers
- Log the call details

<details>
<summary>💡 Click to see the solution</summary>

```javascript
case "setup":
  const { callSid } = message;
  fastify.log.info({ callSid }, "Call connected");

  sessions.set(callSid, {
    conversationHistory: [],
    abortController: null,
  });

  socket.callSid = callSid;
  break;
```

</details>

#### 3.2 Handle the `prompt` message

This is the core handler. When the caller speaks, ConversationRelay transcribes it and sends a `prompt` message with `voicePrompt` containing the text. You need to:

1. Log what the caller said
2. Add it to the session's conversation history
3. Send it to the LLM and stream tokens back to ConversationRelay
4. Handle the end of the response (including possible human transfer)

> [!IMPORTANT]
> **Your task:** Implement the prompt handler. The file already imports `streamResponse` from `../services/llm.js` and declares a `sessions` Map at module level.

**Key implementation points:**

- Look up the session from the `sessions` Map using `socket.callSid`
- Manage an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) on the session for cancellation
- Call `streamResponse` with 4 arguments — it returns `{ transferReason }`:
  ```javascript
  const { transferReason } = await streamResponse(
    session.conversationHistory,
    (token) => { socket.send(JSON.stringify({ type: "text", token, last: false })); },
    session.abortController.signal,
    fastify.log,
  );
  ```
- If `transferReason` is set (human transfer): speak `"Transferring you to a human agent, please wait."` as `{ type: "text", token: "...", last: true }`, then send `{ type: "end", handoffData: JSON.stringify({ reason, conversationHistory }) }`. Twilio will POST to the `/transfer` action URL and play hold music.
- If `transferReason` is **null** (normal end): send `{ type: "text", token: "", last: true }` to finalize TTS. Do **not** send `{ type: "end" }` — ConversationRelay stays open until the call disconnects naturally.
- Wrap in try/catch — catch both `AbortError` and `APIUserAbortError` (ignore them). For other errors, send an apology message to the caller.

<details>
<summary>💡 Click to see the solution</summary>

Handling `"prompt"` messages over websocket:

```javascript
case "prompt":
  fastify.log.info({ voicePrompt: message.voicePrompt }, "Caller said");
  session = sessions.get(socket.callSid);

  if (session.abortController) {
    session.abortController.abort();
  }
  session.abortController = new AbortController();

  try {
    session.conversationHistory.push({ role: "user", content: message.voicePrompt });

    const { transferReason } = await streamResponse(
      session.conversationHistory,
      (token) => {
        socket.send(JSON.stringify({ type: "text", token, last: false }));
      },
      session.abortController.signal,
      fastify.log,
    );

    if (transferReason) {
      fastify.log.info({ reason: transferReason }, "Transferring to human agent");
      socket.send(
        JSON.stringify({
          type: "text",
          token: "Transferring you to a human agent, please wait.",
          last: true,
        }),
      );
      socket.send(
        JSON.stringify({
          type: "end",
          handoffData: JSON.stringify({
            reason: transferReason,
            conversationHistory: session.conversationHistory,
          }),
        }),
      );
    } else {
      socket.send(JSON.stringify({ type: "text", token: "", last: true }));
    }
  } catch (error) {
    if (error.name !== "AbortError" && error.name !== "APIUserAbortError") {
      fastify.log.error(error, "LLM streaming error");
      socket.send(
        JSON.stringify({
          type: "text",
          token: "I'm sorry, I'm having trouble processing that. Could you try again?",
          last: true,
        }),
      );
    }
  }
  break;
```

</details>

#### 3.3 Handle `interrupt`

When the caller speaks while the agent is talking (TTS is playing), ConversationRelay sends an `interrupt` message. You should abort any in-flight LLM request.

<details>
<summary>💡 Click to see the solution</summary>

```javascript
case "interrupt":
  fastify.log.info(
    { utteranceUntilInterrupt: message.utteranceUntilInterrupt },
    "Caller interrupted",
  );
  session = sessions.get(socket.callSid);
  if (session.abortController) {
    session.abortController.abort();
    session.abortController = null;
  }
  break;
```

</details>

#### 3.4 Handle `dtmf`, `error`, and `close`

Simple logging handlers for DTMF key presses, errors, and session cleanup.

<details>
<summary>💡 Click to see the solution</summary>

```javascript
case "dtmf":
  fastify.log.info({ digit: message.digit }, "DTMF received");
  break;

case "error":
  fastify.log.error(
    { description: message.description },
    "ConversationRelay error",
  );
  break;
```

Also add cleanup on socket close using the sessions Map:

```javascript
socket.on("close", () => {
  fastify.log.info("WebSocket connection closed");
  const session = sessions.get(socket.callSid);
  if (session?.abortController) {
    session.abortController.abort();
  }
});
```

</details>

#### 3.5 Test WebSocket handling

1. Restart your server
2. Call the phone number
3. After the greeting, say something
4. Check your server logs — you should see the `setup` and `prompt` messages logged
5. The agent will respond with the placeholder message from `llm.js` ("I'm not fully set up yet...")

- [ ] Setup message logged with callSid
- [ ] Prompt messages appear when you speak
- [ ] Placeholder LLM response is spoken back to you

✅ WebSocket handling complete.

---

### 4. LLM Integration

This is where the agent comes alive. You can choose any LLM provider, in this example we are using OpenAI.

Open `build/services/llm.js` — this is pre-built for you, including the system prompt, tool definitions, tool execution, and streaming logic.

#### 4.1 Review the system prompt

The system prompt defines the agent's persona and behavior. It instructs the model to be Vanguard, the Signal City Transit virtual assistant.

**Key aspects of the prompt:**

- Identifies as "Vanguard" from Signal City Transit
- Helps with routes, schedules, and lost item reports
- Keeps responses concise — 1-2 sentences (callers are listening, not reading)
- **Voice-aware formatting:** Explicitly prohibits markdown, bullet points, numbered lists, arrows, asterisks, or special characters. Everything must be natural spoken sentences.
- Always uses tools for data — never makes up route information
- Transfers to human when asked or when unable to help

#### 4.2 Review the tool definitions

The implementation defines 4 tools using the Responses API format (flat `{ type: "function", name, description, parameters }` with no nested `function` wrapper):

1. **`get_routes`** — No parameters. Returns all Signal City Transit routes.
2. **`get_schedule`** — Takes `route_name` (string). Returns the schedule for a specific route.
3. **`report_lost_item`** — Takes `caller_name`, `route_name`, `item_description`, `contact_phone` (all required strings). Creates a lost item report.
4. **`transfer_to_human`** — Takes `reason` (string). Transfers the caller to a human agent.

> [!TIP]
> See the [OpenAI Responses API docs](https://platform.openai.com/docs/api-reference/responses) for the tool definition format.

#### 4.3 Review tool execution

The `executeToolCall` function dispatches tool calls to the appropriate handlers. Each tool returns a JSON string that gets fed back to the LLM.

**Implementation details:**

- `get_routes` → calls `getRoutes()` from transit-data.js and returns as JSON
- `get_schedule` → calls `getSchedule(args.route_name)`, returns result or error if not found
- `report_lost_item` → generates a reference number like `SCT-LI-XXXXXX` and returns confirmation
- `transfer_to_human` → returns `{ action: "transfer", reason }` (the WebSocket handler uses this to end the session)

#### 4.4 Review the streaming implementation

The `streamResponse` function handles the complete LLM interaction with streaming and function calling.

**What `streamResponse` does:**

1. Calls the OpenAI Responses API with `stream: true`, passing the `SYSTEM_PROMPT` as `instructions` and the `conversationHistory` as `input`
2. Streams text tokens to the caller via the `onToken` callback in real-time
3. Handles tool calls in a loop — when the LLM requests tools, it executes them via `executeToolCall`, pushes results back to `conversationHistory`, and loops for another response
4. Returns `{ transferReason }` — either `null` (normal response) or a string reason (human transfer requested)

**Signature:**

```javascript
const { transferReason } = await streamResponse(
  session.conversationHistory, // mutated in-place with assistant/tool messages
  onToken,                     // (token: string) => void — called for each text chunk
  signal,                      // AbortSignal — to cancel on interrupt
  log,                         // fastify.log — for structured logging
);
```

> [!NOTE]
> The Responses API simplifies streaming compared to Chat Completions: tool calls arrive as complete `response.output_item.done` events instead of incremental chunks, and conversation history uses `type: "function_call"` / `type: "function_call_output"` instead of `role: "assistant"` with `tool_calls`.

---

### 5. Conversational Intelligence Setup

Now that the voice agent works, let's add observability. Twilio Conversational Intelligence automatically transcribes calls and runs language operators to analyze conversations.

#### 5.1 Create an Intelligence Service

1. In the Twilio Console, navigate to **Conversational Intelligence**
2. Click **"Create a Service"**
3. Give it a name (e.g., "Virtual Vanguard Intelligence")
4. Set the language to **English**
5. Enable **Auto-transcribe**
6. Save and copy the **Service SID** (starts with `GA`)

Add the Service SID to your `.env` file:

```
TWILIO_INTELLIGENCE_SERVICE_SID=GAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> [!TIP]
> See the [Conversational Intelligence onboarding docs](https://www.twilio.com/docs/conversational-intelligence/onboarding) for detailed setup instructions.

#### 5.2 Create a custom operator: Lost Item Description Extractor

This generative custom operator analyzes call transcripts and extracts how callers described their lost items.

1. In the Intelligence Service, go to **Operators**
2. Click **"Create Custom Operator"**
3. Choose **"Generative"** as the operator type
4. Configure:
   - **Name:** Lost Item Description Extractor
   - **Prompt:**
     ```
     Analyze this conversation transcript from Signal City Transit's customer support line.
     Extract a description of any lost item mentioned by the caller.
     If a lost item was reported, return a brief summary of: what the item is, which route it was lost on, and any distinguishing features the caller mentioned.
     If no lost item was discussed, return "No lost item reported."
     ```
5. Save the operator

> [!NOTE]
> This operator is created entirely in the Console — no code changes needed. It runs automatically after each call.

#### 5.3 Enable pre-built operators (optional)

In the same Intelligence Service:

1. Go to **Operators → Browse Pre-Built**
2. Enable **"Escalation Request"** — detects when a customer asks for a human agent
3. Enable **"Call Transfer"** — detects when a call transfer occurred

#### 5.4 Update TwiML to enable Conversational Intelligence

Your `twiml.js` should already handle this — the code checks for `TWILIO_INTELLIGENCE_SERVICE_SID` and adds the `intelligenceService` attribute to the ConversationRelay noun.

If you implemented the full solution in Section 2.3, you're already set. Just make sure the SID is in your `.env` file.

> [!IMPORTANT]
> Restart your server after updating `.env` so the new environment variable is loaded.

<details>
<summary>💡 Verify your twiml.js includes this logic</summary>

In your TwiML template, the `<ConversationRelay>` tag should conditionally include the `intelligenceService` attribute:

```javascript
const intelligenceServiceSid =
  process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

// Inside the TwiML template:
`<ConversationRelay
    ...
    ${intelligenceServiceSid ? `intelligenceService="${intelligenceServiceSid}"` : ""} />`
```

This should already be in your implementation from Section 2.3.

</details>

#### 5.5 Test Conversational Intelligence

1. Restart your server
2. Call the phone number and have a conversation (try a lost item report)
3. End the call
4. In the Twilio Console, go to **Conversational Intelligence → Transcripts**
5. You should see your call's transcript with operator results

> [!NOTE]
> It may take a minute for the transcript and operator results to appear after the call ends.

- [ ] Intelligence Service created with Service SID in `.env`
- [ ] Custom operator "Lost Item Description Extractor" created
- [ ] Pre-built operators enabled: Escalation Request, Call Transfer
- [ ] TwiML includes `intelligenceService` attribute
- [ ] Transcript appears in Console after a call

✅ Conversational Intelligence enabled.

---

### 6. Intelligence Webhook & Specialized Operators

In this final section, you'll receive analysis results programmatically via webhook and enable specialized operators designed for AI agent conversations.

#### 6.1 Implement the intelligence webhook

Open `build/routes/intelligence.js`. This endpoint receives POST requests from Conversational Intelligence after it finishes analyzing a call.

> [!IMPORTANT]
> **Your task:** Fetch and log operator results using the Twilio Intelligence API.

**Key implementation points:**

- The webhook is a **notification only** — it contains `transcript_sid` and `service_sid`, but **not** the operator results
- You must fetch operator results via the Twilio SDK: `client.intelligence.v2.transcripts(transcript_sid).operatorResults.list()`
- Create a Twilio client **at module level** using API key credentials (`TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_ACCOUNT_SID`) so it is reused across requests
- Each operator result from the SDK has: `name`, `operatorType`, `predictedLabel`, `predictedProbability`, `textGenerationResults`, `jsonResults`
- Log each operator's results and reply with `200`

<details>
<summary>💡 Click to see the solution</summary>

```javascript
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_API_KEY_SID,
  process.env.TWILIO_API_KEY_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID },
);

export default async function intelligenceRoute(fastify) {
  fastify.post("/webhook/intelligence", async (request, reply) => {
    const { transcript_sid, service_sid } = request.body;

    fastify.log.info(
      { transcriptSid: transcript_sid, serviceSid: service_sid },
      "Conversational Intelligence webhook received",
    );

    // The webhook is a notification only — fetch operator results via the API.
    const results = await client.intelligence.v2
      .transcripts(transcript_sid)
      .operatorResults.list();

    for (const result of results) {
      fastify.log.info(
        {
          operatorName: result.name,
          operatorType: result.operatorType,
          predictedLabel: result.predictedLabel,
          predictedProbability: result.predictedProbability,
          textGenerationResults: result.textGenerationResults,
          jsonResults: result.jsonResults,
        },
        "Operator result",
      );
    }

    reply.status(200).send({ received: true });
  });
}
```

</details>

#### 6.2 Configure the webhook URL

1. In the Twilio Console, go to your **Intelligence Service**
2. Under **Settings → Webhooks**, set the webhook URL to: `{your_ngrok_url}/webhook/intelligence`
3. Save

#### 6.3 Create specialized operator: Human Escalation Request

Conversational Intelligence offers six specialized operators designed specifically for AI agent conversations. **These are not pre-built toggles** — each must be manually created as a Generative Custom Operator using prompts provided by Twilio. Here you'll create the Human Escalation Request operator.

> [!IMPORTANT]
> **Your task:** Create the Human Escalation Request operator in your Intelligence Service.

**Steps:**

1. In the [Twilio Console](https://1console.twilio.com/), navigate to **Conversational Intelligence → Services** and select your service
2. Click **"Create Custom Operator"**
3. Configure the operator with these exact values:

   | Field | Value |
   |-------|-------|
   | **Friendly Name** | `Human Escalation Request` |
   | **Operator Type** | `Generative` |

4. In the **Prompt** field, enter:

   > You are an expert data annotator. You have been tasked with annotating transcripts of voice calls to a customer support center. Specifically, for each transcript you must decide if the customer requested a call escalation. An escalation refers to a customer being transferred or wanting to be transferred from a virtual agent to a human agent member of the customer support center's staff.

5. In the **JSON Output Format** field, enter:

   ```json
   {
     "type": "object",
     "properties": {
       "escalation": {
         "type": "boolean"
       }
     }
   }
   ```

6. Click **"Add to service"**

This operator will return `{"escalation": true}` when a caller requested a human agent, and `{"escalation": false}` otherwise.

> [!TIP]
> The [ConversationRelay integration docs](https://www.twilio.com/docs/conversational-intelligence/conversation-relay-integration) contain sample prompts and JSON schemas for all 6 specialized operators. See the [Generative Custom Operators docs](https://www.twilio.com/docs/conversational-intelligence/generative-custom-operators) for full details on the creation fields (Friendly Name, Prompt, JSON Output Format, Training Examples).

#### 6.4 Test the full intelligence pipeline

1. Restart your server
2. Call the phone number
3. Ask to speak with a human agent — the call should end with handoff
4. Wait a minute, then check your server logs
5. You should see the intelligence webhook fire with operator results, including the Human Escalation Request result showing `escalation: true`

- [ ] Intelligence webhook receives POST with transcript data
- [ ] Operator results are logged (Escalation Request, Call Transfer, Lost Item Description)
- [ ] Human Escalation Request operator correctly identifies escalation requests

#### 6.5 Other specialized operators

> **Presenter-led discussion.** Twilio's ML team provides 5 more Generative Custom Operators for AI agent conversations. Each is created the same way as the Human Escalation Request in section 6.3 — navigate to your Intelligence Service, click "Create Custom Operator", select Generative, and paste the sample prompt and JSON schema from the [ConversationRelay integration docs](https://www.twilio.com/docs/conversational-intelligence/conversation-relay-integration).
>
> - **Virtual Agent Task Completion** — Did the agent resolve the customer's request? Returns a JSON array of tasks with completion status.
> - **Hallucination Detection** — Did the agent say anything factually incorrect or contradictory?
> - **Toxicity Detection** — Did the agent use inappropriate or harmful language?
> - **Virtual Agent Predictive CSAT** — Customer satisfaction score (0–5) derived from the conversation.
> - **Customer Emotion Tagging** — Tracks and categorizes customer sentiment throughout the call.

#### 6.6 Final review

Congratulations! You've built a complete, observable Voice AI agent. Let's review what you accomplished:

- [x] Set up ConversationRelay to bridge phone calls with your server
- [x] Handled real-time WebSocket messages for speech, interrupts, and DTMF
- [x] Integrated OpenAI GPT-5 mini with streaming and function calling
- [x] Built 4 tools: route lookup, schedule lookup, lost item reporting, human escalation
- [x] Added Conversational Intelligence for automatic post-call analysis
- [x] Created a custom operator to extract lost item descriptions
- [x] Enabled pre-built and specialized operators for observability
- [x] Received analysis results via webhook

✅ All done!

---

## Summing Up

You've built a production-grade Voice AI agent that:

- **Deflects routine inquiries** — route info and schedules answered automatically
- **Collects structured data** — lost item reports with reference numbers
- **Escalates gracefully** — human handoff with full conversation context
- **Is observable** — every call is transcribed and analyzed by language operators
- **Is coachable** — operator results reveal how the agent performs and where it needs improvement

### Useful Links

- [ConversationRelay Documentation](https://www.twilio.com/docs/voice/conversationrelay)
- [ConversationRelay Noun Reference](https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun)
- [WebSocket Messages Reference](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages)
- [Conversational Intelligence Onboarding](https://www.twilio.com/docs/conversational-intelligence/onboarding)
- [Generative Custom Operators](https://www.twilio.com/docs/conversational-intelligence/generative-custom-operators)
- [ConversationRelay + Intelligence Integration](https://www.twilio.com/docs/conversational-intelligence/conversation-relay-integration)
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

---

Done! Celebrate! 🎉 ☮️
