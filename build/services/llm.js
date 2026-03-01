import OpenAI from "openai";
import { getRoutes, getSchedule } from "./transit-data.js";

let client;

function getClient() {
  if (!client) client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
}

const MODEL = process.env.MODEL || "gpt-5-mini";

// TODO: Write the system prompt for Vanguard, the Signal City Transit virtual assistant
//
// The prompt should instruct the model to:
// - Identify itself as Vanguard from Signal City Transit
// - Help with routes, schedules, and lost item reports
// - Be concise (1-2 sentences) since callers are listening, not reading
// - IMPORTANT: This is a voice conversation — responses are read aloud by TTS.
//   Instruct the model to never use markdown, bullet points, numbered lists,
//   arrows, asterisks, or special characters. Write everything as natural spoken sentences.
// - Use the provided tools to look up real data — never make up information
// - Transfer to a human when asked or when unable to help
export const SYSTEM_PROMPT = `You are a helpful assistant.`;

// TODO: Define the tools array for the Responses API with these 4 functions:
//
// 1. get_routes - no parameters, returns all routes
// 2. get_schedule - takes route_name (string), returns schedule for that route
// 3. report_lost_item - takes caller_name, route_name, item_description, contact_phone (all strings, all required)
// 4. transfer_to_human - takes reason (string, required)
//
// Use the flat Responses API format — each tool is:
// { type: "function", name, description, parameters }
// (no nested "function" wrapper like Chat Completions)
//
// Docs: https://platform.openai.com/docs/api-reference/responses
const tools = [];

// TODO: Implement this function to execute tool calls from the LLM
//
// Handle each tool by name:
// - get_routes: return JSON.stringify(getRoutes())
// - get_schedule: return JSON.stringify(getSchedule(args.route_name)) or an error if not found
// - report_lost_item: generate a reference number like SCT-LI-XXXXXX and return confirmation
// - transfer_to_human: return JSON.stringify({ action: "transfer", reason: args.reason })
function executeToolCall(name, args) {
  return JSON.stringify({ error: "Not implemented" });
}

export async function streamResponse(conversationHistory, onToken, signal, log) {
  while (true) {
    const stream = await getClient().responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: conversationHistory,
      tools,
      stream: true,
    }, { signal });

    const toolCalls = [];
    let outputText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        onToken(event.delta);
      }

      if (event.type === "response.output_text.done") {
        outputText = event.text;
      }

      if (event.type === "response.output_item.done" && event.item.type === "function_call") {
        toolCalls.push({
          callId: event.item.call_id,
          name: event.item.name,
          arguments: event.item.arguments,
        });
      }
    }

    if (toolCalls.length === 0) {
      log.info({ response: outputText }, "LLM response");
      conversationHistory.push({ role: "assistant", content: outputText });
      return { transferReason: null };
    }

    for (const tc of toolCalls) {
      log.info({ tool: tc.name, arguments: tc.arguments }, "LLM tool call");
    }

    // Execute tool calls and check for transfer
    let transferReason = null;

    for (const tc of toolCalls) {
      conversationHistory.push({
        type: "function_call",
        call_id: tc.callId,
        name: tc.name,
        arguments: tc.arguments,
      });

      const args = JSON.parse(tc.arguments);
      const result = executeToolCall(tc.name, args);
      log.info({ tool: tc.name, result }, "Tool result");

      conversationHistory.push({
        type: "function_call_output",
        call_id: tc.callId,
        output: result,
      });

      if (tc.name === "transfer_to_human") {
        transferReason = args.reason;
      }
    }

    if (transferReason) {
      return { transferReason };
    }

    // Loop continues — LLM will process tool results and respond
  }
}
