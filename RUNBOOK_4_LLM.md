# Section 4: LLM Integration

← [Back to Runbook](./RUNBOOK.md) | [Previous: WebSocket Message Handling](./RUNBOOK_3_WEBSOCKET.md) | [Next: Conversational Intelligence →](./RUNBOOK_5_INTELLIGENCE.md)

This is where the agent comes alive. The LLM integration is **already complete** in `build/services/llm.js`. You'll review how it works and test the function calling features.

> [!TIP]
> **Note on LLM Provider Flexibility**:  
> While this workshop uses OpenAI, you can swap in any LLM provider (Anthropic Claude, Google Gemini, etc.) by modifying `services/llm.js`. The Twilio components (ConversationRelay, Intelligence) work with any LLM.

---

## 4.1 Review the System Prompt

The system prompt defines Vanguard's persona and behavior. It's crucial for voice applications.

### Open `build/services/llm.js`

```javascript
export const SYSTEM_PROMPT = `You are Vanguard, the virtual assistant for Signal City Transit. You help callers with route information, schedules, and lost item reports.

Guidelines:
- Be concise and conversational. Callers are listening, not reading — keep responses to 1-2 sentences when possible.
- This is a voice conversation. Your responses will be read aloud by text-to-speech. Never use markdown, bullet points, numbered lists, arrows, asterisks, colons for lists, or any special characters. Write everything as natural spoken sentences.
- When describing multiple items, use natural speech like "We have three routes: Route 42 the TwiliTown Express, Route 7 the Ferry Line, and Route 15 the Metro Connect." Do not list them with dashes or bullets.
- Use the get_routes tool to answer questions about available routes.
- Use the get_schedule tool when asked about specific route timing or frequency.
- Use report_lost_item when a caller wants to report a lost item. Collect all required details _one by one_: their name, the route they were on, a description of the item, and a callback phone number.
- Use transfer_to_human when the caller explicitly asks to speak with a person or agent, or when you cannot fulfill their request.
- Never make up route or schedule information. Only share data returned by the tools.
- If a caller asks about something outside your capabilities, offer to transfer them to a human agent.`;
```

> [!TIP]
> See Conversation Relay best practices on [normalizing text for TTS docs](https://www.twilio.com/docs/voice/conversationrelay/best-practices#normalizing-text-]for-tts).  

---

## 4.2 Review the Tool Definitions

The implementation defines 4 tools using the **Responses API format**.

### Tool 1: get_routes

```javascript
{
  type: "function",
  name: "get_routes",
  description: "Get a list of all Signal City Transit routes with their stops and descriptions.",
  parameters: { type: "object", properties: {}, required: [] },
}
```

**Purpose**: Return all available routes  
**Parameters**: None  
**Returns**: Array of route objects with name, description, stops

### Tool 2: get_schedule

```javascript
{
  type: "function",
  name: "get_schedule",
  description: "Get the schedule for a specific Signal City Transit route, including weekday and weekend service hours and frequency.",
  parameters: {
    type: "object",
    properties: {
      route_name: {
        type: "string",
        description: 'The name or partial name of the route (e.g. "Ferry", "Route 42", "Metro")',
      },
    },
    required: ["route_name"],
  },
}
```

**Purpose**: Return schedule for a specific route  
**Parameters**: `route_name` (string, required)  
**Returns**: Schedule object with weekday/weekend hours and frequency

### Tool 3: report_lost_item

```javascript
{
  type: "function",
  name: "report_lost_item",
  description: "Report a lost item on Signal City Transit. Collects caller details and creates a report.",
  parameters: {
    type: "object",
    properties: {
      caller_name: { type: "string", description: "The caller's name" },
      route_name: { type: "string", description: "The route the caller was on when they lost the item" },
      item_description: { type: "string", description: "Description of the lost item" },
      contact_phone: { type: "string", description: "Phone number to reach the caller about the item" },
    },
    required: ["caller_name", "route_name", "item_description", "contact_phone"],
  },
}
```

**Purpose**: Create a lost item report  
**Parameters**: 4 required strings (caller_name, route_name, item_description, contact_phone)  
**Returns**: Confirmation with reference number (`SCT-LI-XXXXXX`)

**Note**: 
- The system prompt instructs the LLM to collect these details **one by one** for natural conversation flow.
- In production, this would create a database record

### Tool 4: transfer_to_human

```javascript
{
  type: "function",
  name: "transfer_to_human",
  description: "Transfer the caller to a human agent. Use when the caller requests a person or when you cannot fulfill their request.",
  parameters: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Brief reason for the transfer" },
    },
    required: ["reason"],
  },
}
```

**Purpose**: Trigger call transfer to human agent  
**Parameters**: `reason` (string, required)  
**Returns**: Transfer signal (handled specially by WebSocket handler)

---


## 4.3 Review the Streaming Implementation

The `streamResponse` function in `build/services/llm.js` is already fully implemented. You don't need to write it — but understanding it will help you debug and extend the agent.

**What `streamResponse` does:**

1. Calls the OpenAI Responses API with `stream: true`, passing the `SYSTEM_PROMPT` as `instructions` and the `conversationHistory` as `input`
2. Streams text tokens to the caller via the `onToken` callback
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

## 4.4 Demo: Route Tool Call

Let's test the `get_routes` function.

1. **Make sure your server is running**

2. **Call your Twilio phone number**

3. **After the welcome greeting, ask about routes**:
   - Say: _"What routes do you have?"_
   - Or: _"Tell me about your routes"_
   - Or: _"What buses are available?"_

4. **Listen to the response**:
   - Agent should list 3 routes:
     - Route 42: TwiliTown Express
     - Route 7: Ferry Line
     - Route 15: Metro Connect

5. **Check your server logs**:
   ```
   Caller said: { voicePrompt: 'What routes do you have?' }
   Tool call: get_routes
   Tool result: [{"name":"Route 42",...}]
   ```


---

## 4.5 Demo: Schedule Tool Call

Let's test the `get_schedule` function.

1. **Call your Twilio phone number**

2. **Ask about a specific route**:
   - Say: _"When does the ferry run?"_
   - Or: _"What's the schedule for Route 42?"_
   - Or: _"When does the Metro Connect operate?"_

3. **Listen to the response**:
   - Agent should provide schedule details:
     - Weekday hours
     - Weekend hours
     - Frequency (every X minutes)

4. **Check your server logs**:
   ```
   Tool call: get_schedule
   Tool args: { route_name: 'ferry' }
   Tool result: {"weekday_hours":"5:00 AM - 11:00 PM",...}
   ```

---

## 4.6 Demo: Lost Item Tool Call

Let's test the `report_lost_item` function.

1. **Call your Twilio phone number**

2. **Report a lost item**:
   - Say: _"I lost my backpack"_
   - Or: _"I left my phone on the bus"_
   - Or: _"I need to report a lost item"_

3. **Answer the agent's questions**:
   - Agent will ask for:
     - Your name
     - Which route you were on
     - Description of the item
     - Contact phone number
   - Respond naturally to each question

4. **Listen for the reference number**:
   - Agent should confirm: _"I've created your lost item report. Your reference number is SCT-LI-123456. We'll contact you if the item is found."_

5. **Check your server logs**:
   ```
   Tool call: report_lost_item
   Tool args: {
     caller_name: 'John Smith',
     route_name: 'Route 42',
     item_description: 'black backpack',
     contact_phone: '+15551234567'
   }
   Tool result: {
     success: true,
     reference_number: 'SCT-LI-789123',
     ...
   }
   ```

---

## 4.7 Demo: Transfer to Human Tool Call

Let's test the `transfer_to_human` function.

1. **Call your Twilio phone number**

2. **Request a human agent**:
   - Say: _"I want to speak to a person"_
   - Or: _"Can I talk to a real agent?"_
   - Or: _"Transfer me to a human"_

3. **Listen for transfer confirmation**:
   - Agent should say: _"I'll transfer you to a human agent now. Please wait."_ (or similar)
   - Then: _"Transferring you to a human agent, please wait."_
   - Call should end or play hold music

4. **Check your server logs**:
   ```
   Tool call: transfer_to_human
   Tool args: { reason: 'User requested human agent' }
   Tool result: { action: 'transfer', reason: '...' }
   Transferring to human agent: { reason: '...' }
   ```


---

← [Back to Runbook](./RUNBOOK.md) | [Previous: WebSocket Message Handling](./RUNBOOK_3_WEBSOCKET.md) | [Next: Conversational Intelligence →](./RUNBOOK_5_INTELLIGENCE.md)
