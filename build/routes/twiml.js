export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    // TODO: Return TwiML response with <Connect><ConversationRelay> noun
    //
    // Requirements:
    // - Set the WebSocket URL to wss://{request.headers.host}/ws
    // - Set a welcomeGreeting message for Signal City Transit
    // - Enable interruptible and dtmfDetection
    // - If TWILIO_INTELLIGENCE_SERVICE_SID is set, add the intelligenceService attribute
    // - Add <Play loop="0"> AFTER </Connect> with a hold music URL. When the agent sends
    //   { type: "end" } to trigger a human transfer, ConversationRelay exits and Twilio
    //   falls through to this verb, playing on-hold music for the caller indefinitely.
    //
    // Note: With <Language> elements, use <ConversationRelay ...>...</ConversationRelay>
    // instead of the self-closing <ConversationRelay ... /> form.
    //
    // For Voice: see https://www.twilio.com/docs/voice/conversationrelay/voice-configuration.
    // Reply with Content-Type "text/xml"
    //
    // Docs: https://www.twilio.com/docs/voice/twiml/connect/conversationrelay

    reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="wss://${request.headers.host}/ws"
      welcomeGreeting="Welcome to Signal City Transit. I'm Vanguard, your virtual assistant. How can I help you today?"
      interruptible="true"
      dtmfDetection="true"
      ttsProvider="ElevenLabs"
      voice="jqcCZkN6Knx8BJ5TBdYR-0.8_0.8_0.8"
      ${process.env.TWILIO_INTELLIGENCE_SERVICE_SID ? `intelligenceService="${process.env.TWILIO_INTELLIGENCE_SERVICE_SID}"` : ""}
    >
    </ConversationRelay>
  </Connect>
  <Play loop="0">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`);
  });
}
