import { streamResponse } from "../services/llm.js";

const sessions = new Map(); // Map of callSid to { conversationHistory, abortController }

export default async function websocketRoute(fastify) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    fastify.log.info("WebSocket connection established");

    socket.on("message", async (data) => {
      let message;
      let session;
      try {
        message = JSON.parse(data);
      } catch {
        fastify.log.error("Failed to parse WebSocket message");
        return;
      }

      switch (message.type) {
        case "setup":
          // TODO: Initialize this call's session in the sessions Map
          //
          // 1. Extract callSid from message
          // 2. Create a new session: { conversationHistory: [], abortController: null }
          // 3. Store it in the sessions Map with callSid as key
          // 4. Save callSid on the socket (socket.callSid = callSid) for later lookup
          // 5. Log the call details (callSid, from, to)
          break;

        case "prompt":
          // TODO: Handle caller speech — this is the core handler
          //
          // 1. Log message.voicePrompt
          // 2. Get the session from the sessions Map using socket.callSid
          // 3. If there's an existing abortController, abort it (cancel previous in-flight request)
          // 4. Create a new AbortController and store it on the session
          // 5. Push { role: "user", content: message.voicePrompt } to session.conversationHistory
          // 6. Call: const { transferReason } = await streamResponse(
          //      session.conversationHistory,
          //      (token) => { socket.send(JSON.stringify({ type: "text", token, last: false })); },
          //      session.abortController.signal,
          //      fastify.log,
          //    )
          // 7. If transferReason:
          //    - Log the transfer reason
          //    - Send { type: "text", token: "Transferring you to a human agent, please wait.", last: true }
          //    - Send { type: "end", handoffData: JSON.stringify({ reason, conversationHistory }) }
          // 8. Else (normal end): send { type: "text", token: "", last: true }
          // 9. Wrap in try/catch — catch AbortError and APIUserAbortError (ignore them),
          //    for other errors send an apology message to the caller
          //
          // Docs: https://www.twilio.com/docs/voice/conversationrelay/websocket-messages
          break;

        case "interrupt":
          // TODO: Handle caller interruption
          //
          // The caller spoke while TTS was playing. Cancel any in-flight LLM request.
          // 1. Log message.utteranceUntilInterrupt
          // 2. Get session from sessions Map
          // 3. If session has an abortController, abort it and set to null
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
      // TODO: Clean up the session
      //
      // 1. Get the session from the sessions Map using socket.callSid
      // 2. If session has an abortController, abort it
    });
  });
}
