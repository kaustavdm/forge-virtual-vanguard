export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    // TODO: Return TwiML response with <Connect><ConversationRelay> noun
    //
    // Requirements:
    // - Set the WebSocket URL to wss://{request.headers.host}/ws
    // - Set a welcomeGreeting message for Signal City Transit
    // - Set ttsProvider to "Google" (required for Google voices)
    // - Add <Language> child elements for multi-language support:
    //   en-US (voice: en-US-Journey-O), en-GB (voice: en-GB-Journey-D),
    //   en-IN (voice: en-IN-Journey-D), en-AU (voice: en-AU-Journey-D),
    //   hi-IN (voice: hi-IN-Wavenet-D)
    // - Enable interruptible and dtmfDetection
    // - If TWILIO_INTELLIGENCE_SERVICE_SID is set, add the intelligenceService attribute
    // - Add <Play loop="0"> AFTER </Connect> with a hold music URL. When the agent sends
    //   { type: "end" } to trigger a human transfer, ConversationRelay exits and Twilio
    //   falls through to this verb, playing on-hold music for the caller indefinitely.
    //
    // Note: With <Language> elements, use <ConversationRelay ...>...</ConversationRelay>
    // instead of the self-closing <ConversationRelay ... /> form.
    //
    // Reply with Content-Type "text/xml"
    //
    // Docs: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay

    reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>You have reached Twilio Forge: Virtual Vanguard.</Say>
</Response>`);
  });
}
