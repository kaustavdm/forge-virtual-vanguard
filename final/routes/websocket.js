import { streamChatCompletion } from "../services/llm.js";

export default async function websocketRoute(fastify) {
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    const conversationHistory = [];
    let currentAbortController = null;

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
          fastify.log.info(
            { callSid: message.callSid, from: message.from, to: message.to },
            "Call connected",
          );
          break;

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
                socket.send(
                  JSON.stringify({ type: "text", token: "", last: true }),
                );

                if (transferReason) {
                  fastify.log.info(
                    { reason: transferReason },
                    "Transferring to human agent",
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

        case "dtmf":
          fastify.log.info({ digit: message.digit }, "DTMF received");
          break;

        case "error":
          fastify.log.error(
            { description: message.description },
            "ConversationRelay error",
          );
          break;

        default:
          fastify.log.warn({ type: message.type }, "Unknown message type");
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket connection closed");
      if (currentAbortController) {
        currentAbortController.abort();
      }
    });
  });
}
