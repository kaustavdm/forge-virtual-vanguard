export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    const host = request.headers.host;
    const intelligenceServiceSid =
      process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

    let conversationRelayAttrs = `url="wss://${host}/ws"`;
    conversationRelayAttrs += ` welcomeGreeting="Hello! You've reached Signal City Transit. I'm Vanguard, your virtual assistant. How can I help you today?"`;
    conversationRelayAttrs += ` voice="en-US-Journey-O"`;
    conversationRelayAttrs += ` language="en-US"`;
    conversationRelayAttrs += ` interruptible="true"`;
    conversationRelayAttrs += ` dtmfDetection="true"`;

    if (intelligenceServiceSid) {
      conversationRelayAttrs += ` intelligenceService="${intelligenceServiceSid}"`;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay ${conversationRelayAttrs} />
  </Connect>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
