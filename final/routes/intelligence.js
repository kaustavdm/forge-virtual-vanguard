export default async function intelligenceRoute(fastify) {
  fastify.post("/webhook/intelligence", async (request, reply) => {
    const payload = request.body;

    fastify.log.info(
      {
        transcriptSid: payload.transcript_sid,
        serviceSid: payload.service_sid,
      },
      "Conversational Intelligence webhook received",
    );

    if (payload.operator_results) {
      for (const result of payload.operator_results) {
        fastify.log.info(
          {
            operatorName: result.name,
            operatorType: result.operator_type,
            predictedLabel: result.predicted_label,
            predictedProbability: result.predicted_probability,
            textGenerationResult: result.text_generation_result,
          },
          "Operator result",
        );
      }
    }

    reply.status(200).send({ received: true });
  });
}
