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
- How to integrate an LLM with streaming and function calling for voice conversations
- How to use Twilio Conversational Intelligence for post-call analysis
- How to create custom operators and receive analysis results via webhook

## Prerequisites

- **Node.js 24** (LTS version recommended)
- **ngrok** installed and authenticated ([download](https://ngrok.com/download))
- **Twilio Account**, upgraded and active, with a Voice-enabled phone number
- **OpenAI API key** with GPT-5 mini access.
- **Basic knowledge:** JavaScript/Node.js, HTTP APIs, WebSockets

---

## Build

### 1. Setup

#### 1.1 Clone repo and install dependencies

```bash
# Clone the repository
git clone <repository-url>
cd forge-virtual-vanguard

# Install dependencies
npm install
```

> [!TIP]
> This project uses npm workspaces. Running `npm install` in the root directory installs dependencies for both `build/` and `final/` directories.

#### 1.2 Configure environment variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

**Create Twilio API keys:**

If you don't have Twilio credentials already, create a new Twilio API key:

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Navigate to **Account Info → API Keys**
3. Click **"Create API Key"**
4. Enter a friendly name (e.g., "Forge Virtual Vanguard")
5. Save your **API Key SID** and **Secret** securely — the Secret is only shown once

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

#### 1.3 Review bootstrap code

Take a moment to explore the [`./build/`](./build/) directory structure:

- [`build/server.js`](./build/server.js) — Fastify server (pre-configured, no edits needed)
- [`build/services/transit-data.js`](./build/services/transit-data.js) — Transit data helpers (pre-built)
- [`build/routes/twiml.js`](./build/routes/twiml.js) — TwiML route (we'll implement this)
- [`build/routes/websocket.js`](./build/routes/websocket.js) — WebSocket handler (we'll implement this)
- [`build/services/llm.js`](./build/services/llm.js) — LLM integration (we'll implement this)
- [`build/routes/intelligence.js`](./build/routes/intelligence.js) — Intelligence webhook (you'll implement this)
- [`assets/routes.json`](./assets/routes.json) — Signal City Transit route data (shared)

#### 1.4 Start ngrok

In a separate terminal, start ngrok:

```bash
ngrok http 3000
```

Note your **Forwarding URL** (e.g., `https://abc123.ngrok-free.app`). You'll need this for configuring your Twilio phone number.

#### 1.5 Start the server

```bash
npm start
```

> [!NOTE]
> This will start the server from the `build/` directory.
> If you want to test the `final/` code instead, run `npm run start:final`

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

1. Go to the [Twilio Console](https://console.twilio.com/)
2. Navigate to **Voice → Settings → General**
3. Turn on the **Predictive and Generative AI/ML Features Addendum**

> [!IMPORTANT]
> This step is required before ConversationRelay will work. See the [onboarding docs](https://www.twilio.com/docs/voice/conversationrelay/onboarding) for details.

#### 2.2 Configure phone number webhook

1. In the Twilio Console, go to **Phone Numbers → Manage → Active Numbers**
2. Select the phone number you want to use
3. Go to **Configure** tab.
3. Under **Voice Configuration**, set:
    - **Configure with:** "Webhook, TwiML Bin, Function, Studio Flow, Proxy Service"
    - **A call comes in:** Webhook
    - **URL:** `{your_ngrok_url}/twiml` (e.g., `https://abc123.ngrok-free.app/twiml`)
    - **HTTP Method:** POST
4. Click **Save configuration**

#### 2.3 Implement TwiML route

Open `build/routes/twiml.js`. Currently it returns a simple `<Say>` response.

> [!IMPORTANT]
> **Your task:** Replace the `<Say>` placeholder with a `<ConversationRelay>` noun that connects to your WebSocket server.

**Key implementation points:**

- Use `request.headers.host` to build the WebSocket URL: `wss://${request.headers.host}/ws`
- Set a `welcomeGreeting` for Signal City Transit
- Set `ttsProvider` to `"ElevenLabs"` (this is the default)
- To add custom voices, see the docs on [Picking a Voice](https://www.twilio.com/docs/voice/conversationrelay/voice-configuration)
- Enable `interruptible` and `dtmfDetection`
- If `TWILIO_INTELLIGENCE_SERVICE_SID` is set in the environment, add the `intelligenceService` attribute
- Add `<Play loop="0">` **after** `</Connect>` with a hold music URL — when the agent sends `{ type: "end" }` to trigger a human transfer example.
    - ConversationRelay exits and Twilio falls through to this verb, playing on-hold music for the caller.
    - Note: This is our fallback. A production application will actually do the routing.

> [!TIP]
> See the [ConversationRelay noun docs](https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun) for all available attributes.

> [!TIP]
> You may use the [Twilio Node.js helper library](https://www.npmjs.com/package/twilio). But, returning a direct XML is fine as well.

<details>
<summary>💡 Click to see the solution</summary>

```javascript
export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="wss://${request.headers.host}/ws"
      welcomeGreeting="Welcome to Signal City Transit. I'm Vanguard, your virtual assistant. How can I help you today?"
      interruptible="true"
      dtmfDetection="true"
      ttsProvider="ElevenLabs"
      voice="jqcCZkN6Knx8BJ5TBdYR-0.9_0.8_0.8"
      ${process.env.TWILIO_INTELLIGENCE_SERVICE_SID ? `intelligenceService="${process.env.TWILIO_INTELLIGENCE_SERVICE_SID}"` : ""}
    >
    </ConversationRelay>
  </Connect>
  <Play loop="0">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`);

  });
}
```

</details>

#### 2.4 Test ConversationRelay connection

1. Restart your server: `npm start`
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

Now let's handle the messages that ConversationRelay sends over the WebSocket. Open `build/routes/websocket.js` — the switch/case structure is already there, but the handlers are empty.

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
> **Your task:** Log the call details from the setup message.

<details>
<summary>💡 Click to see the solution</summary>

```javascript
case "setup":
  fastify.log.info(
    { callSid: message.callSid, from: message.from, to: message.to },
    "Call connected",
  );
  break;
```

</details>

#### 3.2 Handle the `prompt` message

This is the core handler. When the caller speaks, ConversationRelay transcribes it and sends a `prompt` message with `voicePrompt` containing the text. You need to:

1. Log what the caller said
2. Add it to conversation history
3. Send it to the LLM and stream tokens back to ConversationRelay
4. Handle the end of the response (including possible human transfer)

> [!IMPORTANT]
> **Your task:** Implement the prompt handler. This requires importing and calling `streamChatCompletion` from `../services/llm.js`.

**Key implementation points:**

- Add `import { streamChatCompletion } from "../services/llm.js";` at the top of the file
- Maintain a `conversationHistory` array and an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) for cancellation
- Call `streamChatCompletion(conversationHistory, onToken, onEnd, currentAbortController.signal)`:
  - `onToken(token)` — Send `{ type: "text", token, last: false }` via the socket
  - `onEnd(transferReason)`:
    - If `transferReason` is **not null** (human transfer): speak `"Transferring you to a human agent, please wait."` as `{ type: "text", token: "...", last: true }`, then immediately send `{ type: "end", handoffData: JSON.stringify({ reason, conversationHistory }) }`. Twilio will fall through to the `<Play loop="0">` in TwiML and play hold music.
    - If `transferReason` is **null** (normal end): send `{ type: "text", token: "", last: true }` to finalize TTS. Do **not** send `{ type: "end" }` — ConversationRelay stays open until the call disconnects naturally.
- Wrap in try/catch — on error, send an apology message to the caller

<details>
<summary>💡 Click to see the solution</summary>

Add this import at the top of the file:

```javascript
import { streamChatCompletion } from "../services/llm.js";
```

Add these variables inside the WebSocket handler (before `socket.on("message", ...)`):

```javascript
const conversationHistory = [];
let currentAbortController = null;
```

Replace the `prompt` case:

```javascript
case "prompt":
  fastify.log.info({ voicePrompt: message.voicePrompt }, "Caller said");
  conversationHistory.push({
    role: "user",
    content: message.voicePrompt,
  });

  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  try {
    await streamChatCompletion(
      conversationHistory,
      (token) => {
        socket.send(
          JSON.stringify({ type: "text", token, last: false }),
        );
      },
      (transferReason) => {
        if (transferReason) {
          fastify.log.info(
            { reason: transferReason },
            "Transferring to human agent",
          );
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
                conversationHistory,
              }),
            }),
          );
        } else {
          socket.send(
            JSON.stringify({ type: "text", token: "", last: true }),
          );
        }
      },
      currentAbortController.signal,
    );
  } catch (error) {
    if (error.name !== "AbortError") {
      fastify.log.error(error, "LLM streaming error");
      socket.send(
        JSON.stringify({
          type: "text",
          token:
            "I'm sorry, I'm having trouble processing that. Could you try again?",
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
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  break;
```

</details>

#### 3.4 Handle `dtmf` and `error`

Simple logging handlers for DTMF key presses and errors.

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

Also add cleanup on socket close:

```javascript
socket.on("close", () => {
  fastify.log.info("WebSocket connection closed");
  if (currentAbortController) {
    currentAbortController.abort();
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

This is where the agent comes alive. Open `build/services/llm.js` — you'll implement the system prompt, tool definitions, tool execution, and streaming chat completion.

#### 4.1 Write the system prompt

The system prompt defines the agent's persona and behavior. Replace the placeholder `SYSTEM_PROMPT` with instructions for Vanguard, the Signal City Transit virtual assistant.

> [!IMPORTANT]
> **Your task:** Write a system prompt that instructs the model to be concise, use tools for data, and escalate when needed.

**Key points for the prompt:**

- Identify as "Vanguard" from Signal City Transit
- Help with routes, schedules, and lost item reports
- Be concise — 1-2 sentences per response (callers are listening, not reading)
- **Voice-aware formatting:** This is a voice conversation — responses are read aloud by TTS. Instruct the model to never use markdown, bullet points, numbered lists, arrows, asterisks, or special characters. Everything should be natural spoken sentences.
- Always use tools for data — never make up route information
- Transfer to human when asked or when unable to help

<details>
<summary>💡 Click to see the solution</summary>

```javascript
const SYSTEM_PROMPT = `You are Vanguard, the virtual assistant for Signal City Transit. You help callers with route information, schedules, and lost item reports.

Guidelines:
- Be concise and conversational. Callers are listening, not reading — keep responses to 1-2 sentences when possible.
- This is a voice conversation. Your responses will be read aloud by text-to-speech. Never use markdown, bullet points, numbered lists, arrows, asterisks, colons for lists, or any special characters. Write everything as natural spoken sentences.
- When describing multiple items, use natural speech like "We have three routes: Route 42 the TwiliTown Express, Route 7 the Ferry Line, and Route 15 the Metro Connect." Do not list them with dashes or bullets.
- Use the get_routes tool to answer questions about available routes.
- Use the get_schedule tool when asked about specific route timing or frequency.
- Use report_lost_item when a caller wants to report a lost item. Collect all required details: their name, the route they were on, a description of the item, and a callback phone number.
- Use transfer_to_human when the caller explicitly asks to speak with a person or agent, or when you cannot help with their request.
- Never make up route or schedule information. Only share data returned by the tools.
- If a caller asks about something outside your capabilities, offer to transfer them to a human agent.`;
```

</details>

#### 4.2 Define the tools

OpenAI function calling requires tool definitions in JSON Schema format. Define 4 tools:

1. **`get_routes`** — No parameters. Returns all Signal City Transit routes.
2. **`get_schedule`** — Takes `route_name` (string). Returns the schedule for a specific route.
3. **`report_lost_item`** — Takes `caller_name`, `route_name`, `item_description`, `contact_phone` (all required strings). Creates a lost item report.
4. **`transfer_to_human`** — Takes `reason` (string). Transfers the caller to a human agent.

> [!TIP]
> See the [OpenAI function calling docs](https://platform.openai.com/docs/guides/function-calling) for the tool definition format.

<details>
<summary>💡 Click to see the solution</summary>

```javascript
const tools = [
  {
    type: "function",
    function: {
      name: "get_routes",
      description:
        "Get a list of all Signal City Transit routes with their stops and descriptions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Get the schedule for a specific Signal City Transit route, including weekday and weekend service hours and frequency.",
      parameters: {
        type: "object",
        properties: {
          route_name: {
            type: "string",
            description:
              'The name or partial name of the route (e.g. "Ferry", "Route 42", "Metro")',
          },
        },
        required: ["route_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_lost_item",
      description:
        "Report a lost item on Signal City Transit. Collects caller details and creates a report.",
      parameters: {
        type: "object",
        properties: {
          caller_name: {
            type: "string",
            description: "The caller's name",
          },
          route_name: {
            type: "string",
            description: "The route the caller was on when they lost the item",
          },
          item_description: {
            type: "string",
            description: "Description of the lost item",
          },
          contact_phone: {
            type: "string",
            description: "Phone number to reach the caller about the item",
          },
        },
        required: [
          "caller_name",
          "route_name",
          "item_description",
          "contact_phone",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description:
        "Transfer the caller to a human agent. Use when the caller requests a person or when you cannot fulfill their request.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Brief reason for the transfer",
          },
        },
        required: ["reason"],
      },
    },
  },
];
```

</details>

#### 4.3 Implement tool execution

The `executeToolCall` function dispatches tool calls to the appropriate handlers. Each tool returns a JSON string that gets fed back to the LLM.

> [!IMPORTANT]
> **Your task:** Implement the switch/case for each tool name.

**Key implementation points:**

- `get_routes` → call `getRoutes()` from transit-data.js and return as JSON
- `get_schedule` → call `getSchedule(args.route_name)`, return result or error if not found
- `report_lost_item` → generate a reference number like `SCT-LI-XXXXXX` and return confirmation
- `transfer_to_human` → return `{ action: "transfer", reason }` (the WebSocket handler uses this to end the session)

<details>
<summary>💡 Click to see the solution</summary>

```javascript
function executeToolCall(name, args) {
  switch (name) {
    case "get_routes":
      return JSON.stringify(getRoutes());
    case "get_schedule": {
      const schedule = getSchedule(args.route_name);
      return schedule
        ? JSON.stringify(schedule)
        : JSON.stringify({ error: `No route found matching "${args.route_name}"` });
    }
    case "report_lost_item": {
      const refNumber = `SCT-LI-${Math.random().toString().slice(2, 8)}`;
      return JSON.stringify({
        success: true,
        reference_number: refNumber,
        message: `Lost item report created. Reference: ${refNumber}`,
        details: args,
      });
    }
    case "transfer_to_human":
      return JSON.stringify({ action: "transfer", reason: args.reason });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
```

</details>

#### 4.4 Implement streaming chat completion

This is the most complex function. It streams tokens from OpenAI to the WebSocket in real-time, and handles tool calls in a loop.

> [!IMPORTANT]
> **Your task:** Replace the placeholder `streamChatCompletion` with the full streaming implementation.

**The flow:**

1. Build the messages array: system prompt + conversation history
2. Call `client.chat.completions.create()` with `stream: true`. Pass `signal` in the second argument (request options) for abort support.
3. Process the stream:
   - **Text tokens** (`delta.content`) → call `onToken(token)` immediately
   - **Tool call chunks** (`delta.tool_calls`) → accumulate arguments across chunks
   - **Finish reason `"stop"`** → persist assistant message to **both** `messages` and `conversationHistory`, then call `onEnd(null)`
   - **Finish reason `"tool_calls"`** → persist assistant + tool result messages to **both** arrays, execute each tool, loop back to step 2

> [!IMPORTANT]
> You must push new messages to **both** the local `messages` array and the `conversationHistory` array. The `messages` array is local to this function call, while `conversationHistory` persists across caller turns. If you only update `messages`, the model loses all context on the next turn.

> [!NOTE]
> Tool calls arrive as incremental chunks in the stream. You need to accumulate the function name and arguments across multiple chunks before parsing.

<details>
<summary>💡 Click to see the solution</summary>

```javascript
export async function streamChatCompletion(conversationHistory, onToken, onEnd, signal) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...conversationHistory];

  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;

    const stream = await getClient().chat.completions.create({
      model: "gpt-5-mini",
      messages,
      tools,
      stream: true,
    }, { signal });

    let assistantContent = "";
    let toolCalls = [];

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      if (delta?.content) {
        assistantContent += delta.content;
        onToken(delta.content);
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index !== undefined) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = {
                id: tc.id || "",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) toolCalls[tc.index].id = tc.id;
            if (tc.function?.name)
              toolCalls[tc.index].function.name += tc.function.name;
            if (tc.function?.arguments)
              toolCalls[tc.index].function.arguments += tc.function.arguments;
          }
        }
      }

      if (choice.finish_reason === "stop") {
        if (assistantContent) {
          const assistantMsg = { role: "assistant", content: assistantContent };
          messages.push(assistantMsg);
          conversationHistory.push(assistantMsg);
        }
        onEnd(null);
      }

      if (choice.finish_reason === "tool_calls") {
        const assistantMsg = {
          role: "assistant",
          content: assistantContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: tc.function,
          })),
        };
        messages.push(assistantMsg);
        conversationHistory.push(assistantMsg);

        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments);

          if (tc.function.name === "transfer_to_human") {
            onEnd(args.reason);
            return;
          }

          const result = executeToolCall(tc.function.name, args);
          const toolMsg = {
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          };
          messages.push(toolMsg);
          conversationHistory.push(toolMsg);
        }

        toolCalls = [];
        assistantContent = "";
        continueLoop = true;
      }
    }
  }
}
```

</details>

#### 4.5 Test the complete voice agent

Restart your server and call the phone number. Try these scenarios:

1. **Route inquiry:** _"What routes do you have?"_ → Agent should list the 3 Signal City Transit routes
2. **Schedule inquiry:** _"When does the ferry run?"_ → Agent should provide Ferry Line schedule details
3. **Lost item report:** _"I lost my backpack on the metro"_ → Agent should ask for your name, contact phone, and item details, then confirm with a reference number
4. **Human escalation:** _"Can I speak to a real person?"_ → Agent should acknowledge and end the session with handoff data

Check your server logs to see the tool calls being executed.

> **Hint:** If you get stuck, check the [`./final/`](./final/) directory for the complete implementation. Run it with `npm run start:final`.

- [ ] Agent responds to route questions with real data
- [ ] Agent provides schedule information for specific routes
- [ ] Agent collects lost item details and returns a reference number
- [ ] Agent transfers to human when asked (call ends with handoff data)
- [ ] Server logs show tool calls being executed

✅ Voice agent complete!

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

#### 5.3 Enable pre-built operators

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

```javascript
if (intelligenceServiceSid) {
  conversationRelayAttrs += ` intelligenceService="${intelligenceServiceSid}"`;
}
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
> **Your task:** Log the transcript and operator results from the webhook payload.

**Key implementation points:**

- The payload contains `transcript_sid`, `service_sid`, and `operator_results`
- Each operator result has: `name`, `operator_type`, `predicted_label`, `predicted_probability`, `text_generation_result`
- Log each operator's results and reply with `200`

<details>
<summary>💡 Click to see the solution</summary>

```javascript
export default async function intelligenceRoute(fastify) {
  fastify.post("/webhook/intelligence", async (request, reply) => {
    const payload = request.body;

    fastify.log.info(
      {
        transcriptSid: payload.transcript_sid,
        serviceSid: payload.service_sid,
      },
      "Conversational Intelligence webhook received",
    );

    if (payload.operator_results) {
      for (const result of payload.operator_results) {
        fastify.log.info(
          {
            operatorName: result.name,
            operatorType: result.operator_type,
            predictedLabel: result.predicted_label,
            predictedProbability: result.predicted_probability,
            textGenerationResult: result.text_generation_result,
          },
          "Operator result",
        );
      }
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

Conversational Intelligence offers six specialized operators designed specifically for AI agent conversations. **These are not pre-built toggles** — each must be manually created as a Generative Custom Operator using prompts provided by Twilio's ML team. Here you'll create the Human Escalation Request operator.

> [!IMPORTANT]
> **Your task:** Create the Human Escalation Request operator in your Intelligence Service.

**Steps:**

1. In the [Twilio Console](https://console.twilio.com/), navigate to **Conversational Intelligence → Services** and select your service
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
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

---

Done! Celebrate! 🎉 ☮️
