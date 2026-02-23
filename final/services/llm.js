import OpenAI from "openai";
import { getRoutes, getSchedule } from "./transit-data.js";

let client;

function getClient() {
  if (!client) client = new OpenAI();
  return client;
}

const SYSTEM_PROMPT = `You are Vanguard, the virtual assistant for Signal City Transit. You help callers with route information, schedules, and lost item reports.

Guidelines:
- Be concise and conversational. Callers are listening, not reading — keep responses to 1-2 sentences when possible.
- Use the get_routes tool to answer questions about available routes.
- Use the get_schedule tool when asked about specific route timing or frequency.
- Use report_lost_item when a caller wants to report a lost item. Collect all required details: their name, the route they were on, a description of the item, and a callback phone number.
- Use transfer_to_human when the caller explicitly asks to speak with a person or agent, or when you cannot help with their request.
- Never make up route or schedule information. Only share data returned by the tools.
- If a caller asks about something outside your capabilities, offer to transfer them to a human agent.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_routes",
      description:
        "Get a list of all Signal City Transit routes with their stops and descriptions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Get the schedule for a specific Signal City Transit route, including weekday and weekend service hours and frequency.",
      parameters: {
        type: "object",
        properties: {
          route_name: {
            type: "string",
            description:
              'The name or partial name of the route (e.g. "Ferry", "Route 42", "Metro")',
          },
        },
        required: ["route_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_lost_item",
      description:
        "Report a lost item on Signal City Transit. Collects caller details and creates a report.",
      parameters: {
        type: "object",
        properties: {
          caller_name: {
            type: "string",
            description: "The caller's name",
          },
          route_name: {
            type: "string",
            description: "The route the caller was on when they lost the item",
          },
          item_description: {
            type: "string",
            description: "Description of the lost item",
          },
          contact_phone: {
            type: "string",
            description: "Phone number to reach the caller about the item",
          },
        },
        required: [
          "caller_name",
          "route_name",
          "item_description",
          "contact_phone",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description:
        "Transfer the caller to a human agent. Use when the caller requests a person or when you cannot fulfill their request.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Brief reason for the transfer",
          },
        },
        required: ["reason"],
      },
    },
  },
];

function executeToolCall(name, args) {
  switch (name) {
    case "get_routes":
      return JSON.stringify(getRoutes());
    case "get_schedule": {
      const schedule = getSchedule(args.route_name);
      return schedule
        ? JSON.stringify(schedule)
        : JSON.stringify({ error: `No route found matching "${args.route_name}"` });
    }
    case "report_lost_item": {
      const refNumber = `SCT-LI-${Math.random().toString().slice(2, 8)}`;
      return JSON.stringify({
        success: true,
        reference_number: refNumber,
        message: `Lost item report created. Reference: ${refNumber}`,
        details: args,
      });
    }
    case "transfer_to_human":
      return JSON.stringify({ action: "transfer", reason: args.reason });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function streamChatCompletion(conversationHistory, onToken, onEnd, signal) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...conversationHistory];

  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;

    const stream = await getClient().chat.completions.create({
      model: "gpt-5-mini",
      messages,
      tools,
      stream: true,
      signal,
    });

    let assistantContent = "";
    let toolCalls = [];

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      if (delta?.content) {
        assistantContent += delta.content;
        onToken(delta.content);
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index !== undefined) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = {
                id: tc.id || "",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) toolCalls[tc.index].id = tc.id;
            if (tc.function?.name)
              toolCalls[tc.index].function.name += tc.function.name;
            if (tc.function?.arguments)
              toolCalls[tc.index].function.arguments += tc.function.arguments;
          }
        }
      }

      if (choice.finish_reason === "stop") {
        if (assistantContent) {
          messages.push({ role: "assistant", content: assistantContent });
        }
        onEnd(null);
      }

      if (choice.finish_reason === "tool_calls") {
        messages.push({
          role: "assistant",
          content: assistantContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: tc.function,
          })),
        });

        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments);

          if (tc.function.name === "transfer_to_human") {
            onEnd(args.reason);
            return;
          }

          const result = executeToolCall(tc.function.name, args);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }

        toolCalls = [];
        assistantContent = "";
        continueLoop = true;
      }
    }
  }
}
