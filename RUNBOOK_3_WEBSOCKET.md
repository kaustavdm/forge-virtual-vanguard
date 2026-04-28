# Section 3: WebSocket Message Handling

← [Back to Runbook](./RUNBOOK.md) | [Previous: ConversationRelay Setup](./RUNBOOK_2_CONVERSATION_RELAY.md) | [Next: LLM Integration →](./RUNBOOK_4_LLM.md)

---

## Overview

ConversationRelay communicates with your server via **WebSocket messages**:
- **`setup`** — Sent once when the connection opens. Contains call metadata.
- **`prompt`** — Sent when the caller finishes speaking. Contains transcribed text.
- **`interrupt`** — Sent when the caller speaks while TTS is playing.
- **`dtmf`** — Sent when the caller presses a key.
- **`error`** — Sent when an error occurs.

You'll implement handlers for each message type in `build/routes/websocket.js`.

> [!TIP]
> See the [WebSocket messages docs](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages) for full details.

---

## 3.1 Handle the `setup` Message

The `setup` message arrives once when the WebSocket connects. It contains call metadata.

### Open `build/routes/websocket.js`

Find the `case "setup":` block (around line 20):

```javascript
case "setup":
  // TODO: Initialize session
  // Extract callSid, create session with conversationHistory and abortController,
  // store in sessions Map, and save callSid on socket
  break;
```

### Implement the Handler

Replace the TODO with this implementation:

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

---

## 3.2 Handle the `prompt` Message

This is the **core handler**. When the caller speaks, ConversationRelay transcribes it and sends a `prompt` message.

### Find the `case "prompt":` Block

Around line 26 in `websocket.js`:

```javascript
case "prompt":
  // TODO: Handle caller speech
  // 1. Log the voicePrompt and get session from sessions Map
  // 2. Abort any existing abortController, create new one
  // 3. Add user message to conversationHistory
  // 4. Call streamResponse() with conversationHistory, token callback, abort signal, logger
  // 5. If transferReason is returned: send transfer message and end with handoffData
  // 6. Else: send empty token with last: true
  // 7. Wrap in try/catch - ignore AbortError/APIUserAbortError, send apology for other errors
  break;
```

### Implement the Handler

Replace the TODO with this implementation:

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

---

## 3.3 Handle `interrupt`

When the caller speaks while the agent is talking, ConversationRelay sends an `interrupt` message. You should abort any in-flight LLM request.

### Find the `case "interrupt":` Block

Around line 37:

```javascript
case "interrupt":
  // TODO: Handle caller interruption
  // Log utteranceUntilInterrupt, get session, abort any in-flight LLM request
  break;
```

### Implement the Handler

```javascript
case "interrupt":
  fastify.log.info({ utteranceUntilInterrupt: message.utteranceUntilInterrupt }, "Caller interrupted");
  session = sessions.get(socket.callSid);
  if (session.abortController) {
    session.abortController.abort();
    session.abortController = null;
  }
  break;
```

---

## 3.4 Handle `dtmf`, `error`, and Socket Close

### DTMF Handler

DTMF (Dual-Tone Multi-Frequency) events occur when the caller presses a key on their phone.

Find `case "dtmf":` (around line 42):

```javascript
case "dtmf":
  // TODO: Log DTMF digit
  break;
```

**Implement**:
```javascript
case "dtmf":
  fastify.log.info({ digit: message.digit }, "DTMF received");
  break;
```

### Error Handler

Find `case "error":` (around line 45):

```javascript
case "error":
  // TODO: Log error description
  break;
```

**Implement**:
```javascript
case "error":
  fastify.log.error({ description: message.description }, "ConversationRelay error");
  break;
```

### Socket Close Handler

Find the `socket.on("close", ...)` handler (around line 55):

```javascript
socket.on("close", () => {
  fastify.log.info("WebSocket connection closed");
  // TODO: Clean up session
  // Get session from sessions Map using socket.callSid and abort any in-flight requests
});
```

**Implement**:
```javascript
socket.on("close", () => {
  fastify.log.info("WebSocket connection closed");
  const session = sessions.get(socket.callSid);
  if (session?.abortController) {
    session.abortController.abort();
  }
});
```

This ensures cleanup when the call ends or WebSocket disconnects.

---

## 3.5 Demo: WebSocket Handling

Let's test the complete WebSocket implementation.

### Steps

1. **Restart your server** to load the new code:
   ```bash
   # Press Ctrl+C to stop, then:
   npm start
   ```

2. **Make sure ngrok is still running**

3. **Call your Twilio phone number**

4. **After the welcome greeting, say something**:
   - Try: _"What routes do you have?"_

5. **Check your server logs**:
   - You should see:
     - `Call connected` (setup message)
     - `Caller said` with the transcribed text (prompt message)
     - LLM tool calls and responses
     - Agent response tokens

6. **Listen to the agent**:
   - The agent should respond with information about Signal City Transit routes

### Expected Behavior

✅ **Success indicators**:
- You hear the welcome greeting
- The agent responds when you speak
- Server logs show setup, prompt, and LLM activity
- Agent provides route information

❌ **Troubleshooting**:

**Agent doesn't respond**:
- Check server logs for errors
- Verify OpenAI API key in `.env`
- Check that `streamResponse` is imported at the top of `websocket.js`

**"I'm sorry, I'm having trouble"**:
- Check OpenAI API key is valid
- Check internet connection
- Check server logs for specific error

**No WebSocket connection**:
- Verify ngrok is running
- Check ngrok URL matches webhook URL in Twilio Console
- Verify server is running on correct port

### Try These Scenarios

1. **Route inquiry**: _"What routes do you have?"_
   - Expected: Agent lists 3 routes

2. **Schedule inquiry**: _"When does the ferry run?"_
   - Expected: Agent provides Ferry Line schedule

3. **Interruption**: Start asking a question, then speak again while agent is responding
   - Expected: Agent stops and processes your new input

4. **Human transfer**: _"I want to speak to a person"_
   - Expected: Agent acknowledges and transfers (call ends)

---

## WebSocket Message Format

### Messages You Send (Server → ConversationRelay)

**Text token** (streaming response):
```json
{
  "type": "text",
  "token": "Hello",
  "last": false
}
```

**Final token**:
```json
{
  "type": "text",
  "token": "",
  "last": true
}
```

**End session** (with handoff data):
```json
{
  "type": "end",
  "handoffData": "{\"reason\":\"User requested human agent\",\"conversationHistory\":[...]}"
}
```

### Messages You Receive (ConversationRelay → Server)

**Setup**:
```json
{
  "type": "setup",
  "callSid": "CA...",
  "from": "+15551234567",
  "to": "+15559876543"
}
```

**Prompt**:
```json
{
  "type": "prompt",
  "voicePrompt": "What routes do you have?"
}
```

**Interrupt**:
```json
{
  "type": "interrupt",
  "utteranceUntilInterrupt": "We have three rou..."
}
```

---

## Resources

- [WebSocket Messages Reference](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages)
- [ConversationRelay Overview](https://www.twilio.com/docs/voice/conversationrelay)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

---

← [Back to Runbook](./RUNBOOK.md) | [Previous: ConversationRelay Setup](./RUNBOOK_2_CONVERSATION_RELAY.md) | [Next: LLM Integration →](./RUNBOOK_4_LLM.md)
