import { streamChatCompletion } from "../services/llm.js";

const sessions = new Map(); // Map of message.callSid to `{ conversationHistory, abortController }`

export default async function websocketRoute(fastify) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    let currentAbortController = null;

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
          const { callSid } = message;
          fastify.log.info({ callSid }, "Call connected");

          // Make a new session entry for this callSid
          sessions.set(callSid, {
            conversationHistory: [],
            abortController: null,
          })

          // Set the callSid on the socket for easy access in future messages
          socket.callSid = callSid;
          break;

        case "prompt":
          fastify.log.info({ voicePrompt: message.voicePrompt }, "Caller said");
          session = sessions.get(socket.callSid);
          session.conversationHistory.push({
            role: "user",
            content: message.voicePrompt,
          });

          if (session.abortController) {
            session.abortController.abort();
          }
          session.abortController = new AbortController();

          try {
            await streamChatCompletion(
              session.conversationHistory,
              (token) => {
                socket.send(JSON.stringify({ type: "text", token, last: false }));
              },
              (transferReason) => {
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
              },
              session.abortController.signal,
            );
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

        case "interrupt":
          fastify.log.info({ utteranceUntilInterrupt: message.utteranceUntilInterrupt }, "Caller interrupted");
          session = sessions.get(socket.callSid);
          if (session.abortController) {
            session.abortController.abort();
            session.abortController = null;
          }
          break;

        case "dtmf":
          fastify.log.info({ digit: message.digit }, "DTMF received");
          break;

        case "error":
          fastify.log.error({ description: message.description }, "ConversationRelay error");
          break;

        default:
          fastify.log.warn({ type: message.type }, "Unknown message type");
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket connection closed");
      const { abortController } = sessions.get(socket.callSid);
      if (abortController) {
        abortController.abort();
      }
    });
  });
}
