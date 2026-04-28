# Section 3: WebSocket Message Handling

← [Back to Runbook](./RUNBOOK.md) | [Previous: ConversationRelay Setup](./RUNBOOK_2_CONVERSATION_RELAY.md) | [Next: LLM Integration →](./RUNBOOK_4_LLM.md)

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

```javascript
case "dtmf":
  fastify.log.info({ digit: message.digit }, "DTMF received");
  break;
```

### Error Handler

```javascript
case "error":
  fastify.log.error({ description: message.description }, "ConversationRelay error");
  break;
```

### Socket Close Handler

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

## Resources

- [WebSocket Messages Reference](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages)
- [ConversationRelay Overview](https://www.twilio.com/docs/voice/conversationrelay)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

---

← [Back to Runbook](./RUNBOOK.md) | [Previous: ConversationRelay Setup](./RUNBOOK_2_CONVERSATION_RELAY.md) | [Next: LLM Integration →](./RUNBOOK_4_LLM.md)
