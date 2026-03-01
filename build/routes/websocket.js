import { streamChatCompletion } from "../services/llm.js";


export default async function websocketRoute(fastify) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    fastify.log.info("WebSocket connection established");
    
    const conversationHistory = []
    let currentAbortController = null;

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
          fastify.log.info({ callSid: message.callSid, from: message.from, to: message.to }, "Call connected");
          break;

        case "prompt":
          // TODO: Handle caller speech
          //
          // 1. Log message.voicePrompt
          // 2. Add { role: "user", content: message.voicePrompt } to conversation history
          // 3. Call streamChatCompletion(conversationHistory, onToken, onEnd, currentAbortController.signal)
          //    - Pass currentAbortController.signal as the 4th argument to support cancellation on interrupt
          //    - onToken callback: send { type: "text", token, last: false } via socket
          //    - onEnd callback:
          //      - If transferReason is set: speak "Transferring you to a human agent, please wait."
          //        as { type: "text", token: "...", last: true }, then send { type: "end", handoffData: ... }
          //        Twilio will fall through to <Play loop="0"> in TwiML and play hold music.
          //      - Otherwise (normal end): send { type: "text", token: "", last: true } only.
          //        Do NOT send { type: "end" } — ConversationRelay stays open until disconnect.
          // 4. Handle errors gracefully - send an apology message to the caller
          //
          // Docs: https://www.twilio.com/docs/voice/conversationrelay/websocket-messages
          fastify.log.info({ voicePrompt: message.voicePrompt }, "Caller said");
          conversationHistory.push({
            role: "user",
            content: message.voicePrompt,
          });

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
