export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    const host = request.headers.host;
    const intelligenceServiceSid =
      process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

    let conversationRelayAttrs = `url="wss://${host}/ws"`;
    conversationRelayAttrs += ` welcomeGreeting="Hello! You've reached Signal City Transit. I'm Vanguard, your virtual assistant. How can I help you today?"`;
    conversationRelayAttrs += ` ttsProvider="ElevenLabs"`;
    conversationRelayAttrs += ` interruptible="true"`;
    conversationRelayAttrs += ` dtmfDetection="true"`;

    if (intelligenceServiceSid) {
      conversationRelayAttrs += ` intelligenceService="${intelligenceServiceSid}"`;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay ${conversationRelayAttrs}>
      <Language code="en-US" voice="jqcCZkN6Knx8BJ5TBdYR-0.8_0.8_0.8" />
      <Language code="en-GB" voice="Fahco4VZzobUeiPqni1S-0.8_1.0_0.7" />
      <Language code="en-IN" voice="90ipbRoKi4CpHXvKVtl0-0.8_0.8_0.8" />
      <Language code="en-AU" voice="ys3XeJJA4ArWMhRpcX1D-0.8_0.8_0.8" />
      <Language code="hi-IN" voice="DpnM70iDHNHZ0Mguv6GJ-0.8_0.8_0.8" />
    </ConversationRelay>
  </Connect>
  <Play loop="0">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
