# Section 5: Conversational Intelligence

← [Back to Runbook](./RUNBOOK.md) | [Previous: LLM Integration](./RUNBOOK_4_LLM.md)

Now that the voice agent works, let's add observability. Twilio Conversational Intelligence automatically transcribes calls and runs language operators to analyze conversations.


## 5.1 Create an Intelligence Service

An Intelligence Service is a container for operators and configuration.


1. Log in to the [Twilio Console](https://1console.twilio.com/)

2. Navigate to **Conversational Intelligence** in the left sidebar or search "Intelligence" in the upper right

3. Click **"Create a Service"**

4. Configure the service:
   - **Service Name**: `Virtual Vanguard Intelligence` (or any name)
   - **Language**: **English**
   - **Auto-transcribe**: **Enabled** ✅

5. Click **"Create"**

6. **Copy the Service SID** (starts with `GA`)
   - Example: `GAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Add Service SID to `.env`

Edit your `.env` file and add the Service SID:

```bash
TWILIO_INTELLIGENCE_SERVICE_SID=GAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> [!IMPORTANT]
> **Restart your server** after updating `.env`:
> ```bash
> # Press Ctrl+C to stop the server, then:
> npm start
> ```

> [!TIP]
> See the [Conversational Intelligence onboarding docs](https://www.twilio.com/docs/conversational-intelligence/onboarding) for detailed setup instructions.

---

## 5.2 Create Custom Operator: Lost Item Description Extractor

Custom operators allow you to extract domain-specific information from call transcripts. Let's create one to analyze transcripts and extracts details about lost items:

1. In your **Intelligence Service**, go to the **Operators** tab

2. Click **"Create Custom Operator"**

3. Select **"Generative"** as the operator type

4. Configure the operator:

   **Friendly Name**:
   ```
   Lost Item Description Extractor
   ```

   **Prompt**:
   ```
   Analyze this conversation transcript from Signal City Transit's customer support line.
   Extract a description of any lost item mentioned by the caller.
   If a lost item was reported, return a brief summary of: what the item is, which route it was lost on, and any distinguishing features the caller mentioned.
   If no lost item was discussed, return "No lost item reported."
   ```

5. Click **"Add to service"** or **"Save"**

> [!NOTE]
> This operator is created entirely in the Console — no code changes needed.

---

## 5.3 Create Custom Operator: Human Escalation Request

Next, let's implement an operator that determines if the customer requested or was transferred to a human agent.

1. In your **Intelligence Service**, go to the **Operators** tab

2. Click **"Create Custom Operator"**

3. Select **"Generative"** as the operator type

4. Configure the operator:

   **Friendly Name**:
   ```
   Human Escalation Request
   ```

   **Prompt**:
   ```
   You are an expert data annotator. You have been tasked with annotating transcripts of voice calls to a customer support center. Specifically, for each transcript you must decide if the customer requested a call escalation. An escalation refers to a customer being transferred or wanting to be transferred from a virtual agent to a human agent member of the customer support center's staff.
   ```

   **JSON Output Format**:
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

5. Click **"Add to service"** 


> [!TIP]
> The [ConversationRelay integration docs](https://www.twilio.com/docs/conversational-intelligence/conversation-relay-integration) contain sample prompts and JSON schemas for other specialized operators. See the [Generative Custom Operators docs](https://www.twilio.com/docs/conversational-intelligence/generative-custom-operators) for full details.

---

## 5.4 Enable Pre-Built Operators (Optional)

Twilio provides pre-built operators for common use cases.


1. In your **Intelligence Service**, go to **Operators → Browse Pre-Built**

2. Browse available operators:
   - **Call Transfer** - Detects when a call transfer occurred
   - **Escalation Request** - Detects escalation requests (similar to custom one)
   - **Sentiment Analysis** - Positive/negative/neutral sentiment

3. Click **"Add to service"** on any operators you want to use

---

## 5.5 Update TwiML to Enable Conversational Intelligence

The TwiML implementation already supports Intelligence — we just need to verify it's configured.

### Verify `build/routes/twiml.js`

```javascript
<ConversationRelay
    url="wss://${host}/ws"
    welcomeGreeting="${WELCOME_GREETING}"
    ttsProvider="ElevenLabs"
    language="en-US"
    ${intelligenceServiceSid ? `intelligenceService="${intelligenceServiceSid}"` : ""} />
```

**Key line**:
```javascript
${intelligenceServiceSid ? `intelligenceService="${intelligenceServiceSid}"` : ""}
```

This conditionally adds the `intelligenceService` attribute if `TWILIO_INTELLIGENCE_SERVICE_SID` is set in `.env`.


---

## 5.6 Implement the Intelligence Webhook

The Intelligence webhook receives notifications when analysis is complete. You need to fetch and log the operator results.

### Open `build/routes/intelligence.js`

You'll see 3 TODO blocks that need implementation.

---

### Step 1: Create Twilio Client

```javascript
const client = twilio(
  process.env.TWILIO_API_KEY_SID,
  process.env.TWILIO_API_KEY_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID },
);
```

**What this does**:
- Creates a Twilio client using API key authentication
- Stored at module level (reused across all webhook calls)
- Uses environment variables from `.env`

---

### Step 2: Fetch Operator Results

```javascript
const results = await client.intelligence.v2
  .transcripts(transcript_sid)
  .operatorResults.list();
```

**What this does**:
- Fetches all operator results for the given transcript
- The webhook payload doesn't include results — only a notification
- Must query the Intelligence API to get results

---

### Step 3: Log Operator Results

```javascript
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
```

**What this does**:
- Loops through all operator results
- Logs each result with structured fields
- Different operators populate different fields:
  - **Classification operators**: Use `predictedLabel` and `predictedProbability`
  - **Generative operators (text)**: Use `textGenerationResults`
  - **Generative operators (JSON)**: Use `jsonResults`


> [!TIP]
> See the [ConversationRelay integration docs](https://www.twilio.com/docs/conversational-intelligence/conversation-relay-integration) for complete prompts and JSON schemas for all specialized operators.

---

## 5.7 Configure the Webhook URL

Tell Twilio where to send Intelligence results.

1. Go to your **Intelligence Service** in the [Twilio Console](https://1console.twilio.com/)

2. Go to **Settings → Webhooks**

3. Set the **Webhook URL**:
   ```
   https://<your-ngrok-url>.ngrok-free.app/webhook/intelligence
   ```
   - Replace `<your-ngrok-url>` with your actual ngrok URL
   - Example: `https://abc123.ngrok-free.app/webhook/intelligence`

4. Set **HTTP Method**: **POST**

5. Click **"Save"**

> [!IMPORTANT]
> If you restart ngrok (free plan), the URL changes. Update the webhook URL here too.

> [!TIP]
> **Testing the webhook with curl**: You can simulate an Intelligence webhook:
> ```bash
> curl -X POST http://localhost:3000/webhook/intelligence \
>   -H "Content-Type: application/json" \
>   -d '{"transcript_sid":"GTxxxxxxxx","service_sid":"GAxxxxxxxx"}'
> ```
> Note: This will attempt to fetch real transcript data from Twilio.

---

## 5.8 Demo: Lost Item with Intelligence

Let's test the complete pipeline with a lost item report.

1. **Restart your server** (if you haven't already):
   ```bash
   npm start
   ```

2. **Call your Twilio phone number**

3. **Report a lost item**:
   - Say: _"I lost my backpack on the metro"_
   - Answer the agent's questions:
     - Name: "John Smith"
     - Route: "Metro Connect" or "Route 15"
     - Item: "black backpack with laptop inside"
     - Phone: your phone number

4. **Listen for confirmation**:
   - Agent should provide reference number: `SCT-LI-XXXXXX`

5. **End the call** (hang up)

6. **Wait ~1-2 minutes** for analysis to complete

7. **Check the Twilio Console**:
   - Go to **Conversational Intelligence → Transcripts**
   - Find your call (sort by date)
   - Click to view details
   - Check **Operators** tab for results

8. **Check your server logs**:
   - You should see:
     ```
     Conversational Intelligence webhook received
     Operator result: {
       operatorName: 'Lost Item Description Extractor',
       textGenerationResults: 'black backpack with laptop inside, lost on Route 15 Metro Connect'
     }
     ```

---

## 5.9 Demo: Human Transfer with Intelligence

Let's test escalation detection.

1. **Call your Twilio phone number**

2. **Request a human agent**:
   - Say: _"I want to speak to a real person"_
   - Or: _"Can I talk to a human?"_
   - Or: _"Transfer me to an agent"_

3. **Listen for transfer confirmation**:
   - Agent should say: _"Transferring you to a human agent, please wait."_
   - Call ends or plays hold music

4. **Wait ~1-2 minutes** for analysis

5. **Check the Twilio Console**:
   - Go to **Conversational Intelligence → Transcripts**
   - Find your call
   - Check **Operators** tab
   - Look for "Human Escalation Request" result

6. **Check your server logs**:
   - You should see:
     ```
     Operator result: {
       operatorName: 'Human Escalation Request',
       jsonResults: '{"escalation":true}'
     }
     ```

---

## 5.10 Demo: Intelligence Webhook Logs

Let's examine what the webhook receives.


### Check Server Logs

After a call with Intelligence enabled, you should see:

```
INFO: Conversational Intelligence webhook received {
  transcriptSid: 'GTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  serviceSid: 'GAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
}

INFO: Operator result {
  operatorName: 'Lost Item Description Extractor',
  operatorType: 'generative_text',
  predictedLabel: null,
  predictedProbability: null,
  textGenerationResults: 'black backpack with laptop inside, lost on Route 15',
  jsonResults: null
}

INFO: Operator result {
  operatorName: 'Human Escalation Request',
  operatorType: 'generative_json',
  predictedLabel: null,
  predictedProbability: null,
  textGenerationResults: null,
  jsonResults: '{"escalation":false}'
}

INFO: Operator result {
  operatorName: 'Sentiment Analysis',
  operatorType: 'classification',
  predictedLabel: 'positive',
  predictedProbability: 0.87,
  textGenerationResults: null,
  jsonResults: null
}
```


---

← [Back to Runbook](./RUNBOOK.md) | [Previous: LLM Integration](./RUNBOOK_4_LLM.md)
