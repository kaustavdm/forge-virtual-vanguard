import OpenAI from "openai";
import { getRoutes, getSchedule } from "./transit-data.js";

let client;

function getClient() {
  if (!client) client = new OpenAI();
  return client;
}

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
const SYSTEM_PROMPT = `You are a helpful assistant.`;

// TODO: Define the OpenAI tools array with these 4 functions:
//
// 1. get_routes - no parameters, returns all routes
// 2. get_schedule - takes route_name (string), returns schedule for that route
// 3. report_lost_item - takes caller_name, route_name, item_description, contact_phone (all strings, all required)
// 4. transfer_to_human - takes reason (string, required)
//
// Each tool should have type: "function" with a function object containing
// name, description, and parameters (JSON Schema format).
//
// Docs: https://platform.openai.com/docs/guides/function-calling
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

// TODO: Implement streaming chat completion with tool call handling
//
// Steps:
// 1. Build messages array with system prompt + conversationHistory
// 2. Call client.chat.completions.create() with model "gpt-5-mini", messages, tools, stream: true
//    Pass signal to the OpenAI create() call to support cancellation on interrupt.
// 3. Iterate over the stream:
//    - When delta.content exists, call onToken(delta.content)
//    - When delta.tool_calls exists, accumulate tool call arguments
//    - On finish_reason "stop", call onEnd(null)
//    - On finish_reason "tool_calls":
//      a. Add assistant message with tool_calls to messages
//      b. Execute each tool call and add tool results to messages
//      c. If tool is "transfer_to_human", call onEnd(reason) and return
//      d. Otherwise, loop and make another completion call with the updated messages
//
// IMPORTANT: When adding assistant/tool messages, push them to BOTH the local
// messages array AND the conversationHistory array. The conversationHistory is
// shared across turns — if you only push to the local messages array, the model
// loses all context on the next caller turn.
//
// Docs: https://platform.openai.com/docs/api-reference/chat/create
export async function streamChatCompletion(
  conversationHistory,
  onToken,
  onEnd,
  signal,
) {
  // Placeholder: just acknowledge
  onToken("I'm not fully set up yet. Please implement the LLM service.");
  onEnd(null);
}
