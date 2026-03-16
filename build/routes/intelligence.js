import twilio from "twilio";

// TODO: Create a Twilio client at module level using API key credentials
//       (TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and accountSid from TWILIO_ACCOUNT_SID)
//       so it is reused across requests instead of recreated on every webhook call.

export default async function intelligenceRoute(fastify) {
  fastify.post("/webhook/intelligence", async (request, reply) => {

    const { transcript_sid, service_sid } = request.body;

    fastify.log.info(
      { transcriptSid: transcript_sid, serviceSid: service_sid },
      "Conversational Intelligence webhook received",
    );

    // TODO: Fetch and log operator results from the Conversational Intelligence API
    //
    // The webhook is a notification only — it tells you analysis is complete,
    // but does NOT include the operator results in the payload.
    // You must fetch the results via the Twilio Intelligence API.
    //
    // Steps:
    // 1. Fetch operator results: client.intelligence.v2.transcripts(transcript_sid).operatorResults.list()
    // 2. Loop through results and log each operator's fields:
    //    - name, operatorType, predictedLabel, predictedProbability,
    //      textGenerationResults, jsonResults
    // 3. Reply with 200 status and { received: true }
    //
    // Docs: https://www.twilio.com/docs/conversational-intelligence/api

    reply.status(200).send({ received: true });
  });
}
