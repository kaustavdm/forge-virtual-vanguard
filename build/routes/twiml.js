const WELCOME_GREETING=`Hi! This is Signal City Transit.
I'm Vanguard, your virtual assistant. How can I help you today?`;

export default async function twimlRoute(fastify) {

  // TwiML endpoint for ConversationRelay
  fastify.all("/twiml", async (request, reply) => {
    const host = request.headers.host;
    const intelligenceServiceSid =
      process.env.TWILIO_INTELLIGENCE_SERVICE_SID || "";

    // TODO: Build the TwiML XML string
    //
    // The TwiML should contain:
    //   <Response>
    //     <Connect action="/transfer" method="POST">
    //       <ConversationRelay
    //           url="wss://{host}/ws"
    //           welcomeGreeting="{WELCOME_GREETING}"
    //           ttsProvider="ElevenLabs"
    //           language="en-US"
    //           {intelligenceService if set} />
    //     </Connect>
    //   </Response>
    //
    // Key points:
    // - action="/transfer" on <Connect> tells Twilio where to POST when ConversationRelay ends
    // - Use self-closing <ConversationRelay ... /> tag
    // - If intelligenceServiceSid is set, add: intelligenceService="${intelligenceServiceSid}"
    //
    // Docs: https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>TwiML not implemented yet.</Say>
</Response>`;

    reply.type("text/xml").send(twiml);
  });

  // Handle transfer after ConversationRelay ends
  fastify.all("/transfer", async (request, reply) => {
    // TODO: Build TwiML XML that plays hold music
    //
    // Return:
    //   <Response>
    //     <Play loop="1">https://demo.twilio.com/docs/classic.mp3</Play>
    //   </Response>
    //
    // This route is called by Twilio when the ConversationRelay session ends
    // (triggered by the action="/transfer" attribute on <Connect>).
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Transfer not implemented yet.</Say>
</Response>`;

    reply.type("text/xml").send(twiml);
  });
}
