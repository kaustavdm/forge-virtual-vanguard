export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    const host = request.headers.host;
    const intelligenceServiceSid =
      process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

    let conversationRelayAttrs = `url="wss://${host}/ws"`;
    conversationRelayAttrs += ` welcomeGreeting="Hello! You've reached Signal City Transit. I'm Vanguard, your virtual assistant. How can I help you today?"`;
    conversationRelayAttrs += ` ttsProvider="Google"`;
    conversationRelayAttrs += ` interruptible="true"`;
    conversationRelayAttrs += ` dtmfDetection="true"`;

    if (intelligenceServiceSid) {
      conversationRelayAttrs += ` intelligenceService="${intelligenceServiceSid}"`;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay ${conversationRelayAttrs}>
      <Language code="en-US" voice="en-US-Journey-O" />
      <Language code="en-GB" voice="en-GB-Journey-D" />
      <Language code="en-IN" voice="en-IN-Journey-D" />
      <Language code="en-AU" voice="en-AU-Journey-D" />
      <Language code="hi-IN" voice="hi-IN-Wavenet-D" />
    </ConversationRelay>
  </Connect>
  <Play loop="0">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
