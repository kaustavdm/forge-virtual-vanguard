export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    // TODO: Return TwiML response with <Connect><ConversationRelay> noun
    //
    // Requirements:
    // - Set the WebSocket URL to wss://{request.headers.host}/ws
    // - Set a welcomeGreeting message for Signal City Transit
    // - Set voice to "en-US-Journey-O" and language to "en-US"
    // - Enable interruptible and dtmfDetection
    // - If TWILIO_INTELLIGENCE_SERVICE_SID is set, add the intelligenceService attribute
    //
    // Reply with Content-Type "text/xml"
    //
    // Docs: https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun

    reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>You have reached Twilio Forge: Virtual Vanguard.</Say>
</Response>`);
  });
}
