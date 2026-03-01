const WELCOME_GREETING=`Hello! You've reached Signal City Transit.
I'm Vanguard, your virtual assistant. How can I help you today?`;

export default async function twimlRoute(fastify) {
  fastify.post("/twiml", async (request, reply) => {
    const host = request.headers.host;
    const intelligenceServiceSid =
      process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay 
        url="wss://${host}/ws"
        welcomeGreeting="${WELCOME_GREETING}"
        ttsProvider="ElevenLabs"
        interruptible="true"
        dtmfDetection="true"
        lang="en-US"
        ${intelligenceServiceSid ? `intelligenceServiceSid="${intelligenceServiceSid}"` : ""} />
  </Connect>
  <Play loop="0">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
