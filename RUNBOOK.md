# Forge Virtual Vanguard – Voice AI Agent Runbook

- **Project**: Voice AI Agent with ConversationRelay & Conversational Intelligence
- **Focus**: Building an Observable, Production-Grade Voice AI Agent
- **Tech Stack**: Node.js 24 (Fastify), Twilio ConversationRelay, Twilio Conversational Intelligence, OpenAI GPT-5 mini
- **Duration**: ~75 min to build
- **Outcome**: A working voice AI agent for Signal City Transit that handles route inquiries, lost item reports, and human escalation — with post-call intelligence analysis

---

## What You'll Learn

- How to configure **ConversationRelay** to bridge phone calls with a WebSocket server
- How to handle **real-time WebSocket messages** (speech, interrupts, DTMF)
- How to use **Conversational Intelligence** for post-call analysis
- How to create **custom operators** and receive analysis results via webhook

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 24** (LTS version recommended)
- **ngrok** installed and authenticated ([download](https://ngrok.com/download))
- **Twilio Account** (upgraded, with a Voice-enabled phone number)
- **OpenAI API key** with GPT-5 mini access
- **Basic knowledge**: JavaScript/Node.js, HTTP APIs, WebSockets

**Optional**:
- **Twilio Dev Phone** - Browser-based calling for testing without a cell phone ([docs](https://www.twilio.com/docs/labs/dev-phone))

---


## Project Structure

This workshop uses **npm workspaces** to simplify dependency management:

- **Root directory**: Configuration files and documentation
- **`./build/` directory**: Scaffolded files where you'll implement Twilio API calls
- **`./final/` directory**: Complete implementation for reference

The npm scripts make it easy to run either version:

```bash
# Run the workshop version you're building (default)
npm start
# or
npm run start:build

# Run the completed reference implementation
npm run start:final
```

### Key Files in `build/`

| File | Purpose | Edit? |
|------|---------|-------|
| `server.js` | Fastify server bootstrap with WebSocket | No |
| `routes/twiml.js` | TwiML endpoint with ConversationRelay | **Yes** |
| `routes/websocket.js` | WebSocket message handlers | **Yes** |
| `routes/intelligence.js` | Intelligence webhook | **Yes** |
| `services/llm.js` | OpenAI Responses API integration | No |
| `services/transit-data.js` | Route and schedule helpers | No |
| `assets/routes.json` | Signal City Transit route data | No |


---

## Workshop Sections 

| # | Section | File | Duration | Optional? |
|---|---------|------|----------|-----------|
| 1 | **Setup** | [RUNBOOK_1_SETUP.md](./RUNBOOK_1_SETUP.md) | ~15 min | No |
| 2 | **ConversationRelay** | [RUNBOOK_2_CONVERSATION_RELAY.md](./RUNBOOK_2_CONVERSATION_RELAY.md) | ~10 min | No |
| 3 | **WebSocket** | [RUNBOOK_3_WEBSOCKET.md](./RUNBOOK_3_WEBSOCKET.md) | ~20 min | No |
| 4 | **LLM Integration** | [RUNBOOK_4_LLM.md](./RUNBOOK_4_LLM.md) | ~10 min | No |
| 5 | **Intelligence** | [RUNBOOK_5_INTELLIGENCE.md](./RUNBOOK_5_INTELLIGENCE.md) | ~20 min | Yes |

**Total Duration**: ~75 minutes

---

## Resources

### Twilio Documentation
- [ConversationRelay Overview](https://www.twilio.com/docs/voice/conversationrelay)
- [ConversationRelay Noun Reference](https://www.twilio.com/docs/voice/conversationrelay/conversationrelay-noun)
- [WebSocket Messages](https://www.twilio.com/docs/voice/conversationrelay/websocket-messages)
- [Conversational Intelligence](https://www.twilio.com/docs/conversational-intelligence)
- [Custom Operators](https://www.twilio.com/docs/conversational-intelligence/generative-custom-operators)
- [ConversationRelay + Intelligence Integration](https://www.twilio.com/docs/conversational-intelligence/conversation-relay-integration)

### OpenAI Documentation
- [Responses API Reference](https://platform.openai.com/docs/api-reference/responses)
- [Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)

### Other Resources
- [Fastify Documentation](https://fastify.dev/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart)

---

## Ready to Start?

**👉 Begin with**: [Section 1: Setup →](./RUNBOOK_1_SETUP.md)

Build a production-grade Voice AI agent in 90 minutes. Let's go! 🚀
