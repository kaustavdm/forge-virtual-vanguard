# Section 2: ConversationRelay Setup

← [Back to Runbook](./RUNBOOK.md) | [Previous: Setup](./RUNBOOK_1_SETUP.md) | [Next: WebSocket →](./RUNBOOK_3_WEBSOCKET.md)

---

## 2.1 Enable ConversationRelay

ConversationRelay requires the **AI Features Addendum** to be accepted on your Twilio account.

1. Go to the [Twilio Console](https://1console.twilio.com/)

2. Navigate to **Products & Services → Voice → Settings → Privacy & security**

3. Find **Predictive and Generative AI/ML Features Addendum**

4. Turn it **ON**

5. Review and accept the terms

> [!IMPORTANT]
> This step is **required** before ConversationRelay will work. Without it, calls will fail with an error.

> [!TIP]
> See the [ConversationRelay onboarding docs](https://www.twilio.com/docs/voice/conversationrelay/onboarding) for detailed instructions.

---

## 2.2 Configure Phone Number Webhook

Connect your Twilio phone number to your server by configuring the webhook URL.

1. In the Twilio Console, go to **Phone Numbers → Manage → Active Numbers** (or search "phone numbers" in the upper right)

2. Select the phone number you want to use
   - **Don't have one?** Click **Buy a number** to purchase a Voice-enabled number

3. Go to the **Configure** tab

4. Scroll to **Voice Configuration**

5. Set the following:
   - **A call comes in**: Select **Webhook**
   - **URL**: `https://<your-ngrok-url>.ngrok-free.app/twiml`
     - Replace `<your-ngrok-url>` with your actual ngrok URL from Section 1.4
     - Example: `https://abc123.ngrok-free.app/twiml`
   - **HTTP Method**: Select **POST**

6. Click **Save**

> [!IMPORTANT]
> **Remember your ngrok URL**: If you restart ngrok (free plan), the URL changes. You'll need to update the webhook URL again with the new ngrok URL.

> [!TIP]
> **Testing the webhook**: You can verify the TwiML endpoint is accessible:
> ```bash
> curl -X POST https://<your-ngrok-url>.ngrok-free.app/twiml
> ```
> You should see XML output with `<ConversationRelay>`.

---

## 2.3 Review TwiML Implementation

The TwiML implementation is in `build/routes/twiml.js`. Let's implement it.

### Open `build/routes/twiml.js`

The file contains two routes:

#### Route 1: `/twiml` - ConversationRelay Configuration

This endpoint returns TwiML that tells Twilio to use ConversationRelay:

```javascript
fastify.all("/twiml", async (request, reply) => {
  const host = request.headers.host;
  const intelligenceServiceSid =
    process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

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

  reply.type("text/xml").send(twiml);
});
```

**Key elements**:

- **`<Response>`** - Root element for Twilio TwiML
- **`<Connect action="/transfer">`** - Wrapper that tells Twilio where to POST when ConversationRelay ends (e.g., after human transfer)
- **`<ConversationRelay>`** - The ConversationRelay noun with configuration:
  - `url="wss://${host}/ws"` - WebSocket endpoint on your server
  - `welcomeGreeting` - Initial message spoken when call connects
  - `ttsProvider="ElevenLabs"` - Text-to-speech provider
  - `language="en-US"` - Language for transcription and TTS
  - `intelligenceService` - (Optional) Intelligence Service SID for post-call analysis

> [!NOTE]
> The `intelligenceService` attribute is only added if `TWILIO_INTELLIGENCE_SERVICE_SID` is set in your `.env` file. We'll add this in Section 5.

#### Route 2: `/transfer` - Hold Music After Transfer

This endpoint is called when ConversationRelay ends (triggered by the `action="/transfer"` attribute):

```javascript
fastify.all("/transfer", async (request, reply) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="1">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

  reply.type("text/xml").send(twiml);
});
```

**What this does**:
- Plays hold music when the agent transfers the caller to a human
- Uses Twilio's demo hold music URL
- Loops once (you could change to `loop="0"` for infinite loop)

### Welcome Greeting

At the top of `twiml.js`, the welcome greeting is defined:

```javascript
const WELCOME_GREETING = `Hi! This is Signal City Transit.
I'm Vanguard, your virtual assistant. How can I help you today?`;
```

This greeting is spoken when the call first connects, before any WebSocket interaction.

---

## 2.4 Demo: ConversationRelay Connection

Let's verify ConversationRelay is working.

1. **Make sure your server is running**:
   ```bash
   npm start
   ```

2. **Make sure ngrok is running** in a separate terminal:
   ```bash
   ngrok http 3000
   ```

3. **Call your Twilio phone number** from any phone (or use Dev Phone)

4. **Listen for the welcome greeting**:
   - You should hear: _"Hi! This is Signal City Transit. I'm Vanguard, your virtual assistant. How can I help you today?"_

5. **Check your server logs**:
   - You should see: `WebSocket connection established`

---

## TwiML Resources

- [ConversationRelay Noun Reference](https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun)
- [TwiML Voice Reference](https://www.twilio.com/docs/voice/twiml)
- [TwiML `<Connect>` Noun](https://www.twilio.com/docs/voice/twiml/connect)
- [TwiML `<Play>` Noun](https://www.twilio.com/docs/voice/twiml/play)

---

← [Back to Runbook](./RUNBOOK.md) | [Previous: Setup](./RUNBOOK_1_SETUP.md) | [Next: WebSocket →](./RUNBOOK_3_WEBSOCKET.md)
