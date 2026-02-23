export default async function websocketRoute(fastify) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    fastify.log.info("WebSocket connection established");

    socket.on("message", async (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        fastify.log.error("Failed to parse WebSocket message");
        return;
      }

      switch (message.type) {
        case "setup":
          // TODO: Log session details (callSid, from, to)
          // The setup message is sent once when the WebSocket connects.
          // Fields: message.callSid, message.from, message.to, message.sessionId
          break;

        case "prompt":
          // TODO: Handle caller speech
          //
          // 1. Log message.voicePrompt
          // 2. Add { role: "user", content: message.voicePrompt } to conversation history
          // 3. Call streamChatCompletion(conversationHistory, onToken, onEnd, currentAbortController.signal)
          //    - Pass currentAbortController.signal as the 4th argument to support cancellation on interrupt
          //    - onToken callback: send { type: "text", token, last: false } via socket
          //    - onEnd callback: send { type: "text", token: "", last: true } via socket
          //      If transferReason is provided, also send { type: "end", handoffData: ... }
          // 4. Handle errors gracefully - send an apology message to the caller
          //
          // Docs: https://www.twilio.com/docs/voice/conversationrelay/websocket-messages
          break;

        case "interrupt":
          // TODO: Handle caller interruption
          // The caller spoke while TTS was playing. Cancel any in-flight LLM request.
          // Fields: message.utteranceUntilInterrupt, message.durationUntilInterruptMs
          break;

        case "dtmf":
          // TODO: Log the DTMF digit (message.digit)
          break;

        case "error":
          // TODO: Log the error (message.description)
          break;

        default:
          fastify.log.warn({ type: message.type }, "Unknown message type");
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket connection closed");
    });
  });
}
