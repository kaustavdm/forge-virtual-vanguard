# Forge Virtual Vanguard – Overview

## What Are We Building Today

A **Voice AI Agent** for a fictional transit company called **Signal City Transit**. When someone calls a Twilio phone number, they speak to "Vanguard" — an AI-powered virtual assistant that can:

- **Answer route and schedule questions** using real transit data
- **Take lost item reports** and issue reference numbers
- **Transfer callers to a human agent** when it can't help or when the caller asks

The agent listens to the caller in real time, thinks with an LLM (OpenAI GPT-5 mini), and speaks back — all over a normal phone call.

After each call, Twilio **Conversational Intelligence** automatically transcribes and analyzes the conversation using language operators (e.g., detecting escalation requests, extracting lost item details).

## How It Works

1. A caller dials the Twilio phone number.
2. Twilio sends a TwiML response that opens a **ConversationRelay** WebSocket to your server.
3. The caller's speech is transcribed and sent to your server as WebSocket messages.
4. Your server forwards the text to the **LLM**, which can call tools (route lookup, schedule lookup, lost item report, human transfer).
5. The LLM's response streams back over the WebSocket, and Twilio converts it to speech via **ElevenLabs TTS**.
6. After the call ends, **Conversational Intelligence** runs operator analysis on the transcript and sends results to a webhook.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Server | Node.js 24 with Fastify |
| Telephony | Twilio Voice + ConversationRelay |
| Speech-to-Text / TTS | Twilio ConversationRelay (ElevenLabs) |
| LLM | OpenAI GPT-5 mini (Responses API with streaming) |
| Post-call analysis | Twilio Conversational Intelligence |
| Tunneling | ngrok |

## Runbook Sections at a Glance

| # | Section | What You Do |
|---|---------|-------------|
| 1 | **Setup** | Clone the repo, configure environment variables, start ngrok and the server |
| 2 | **ConversationRelay Setup** | Write TwiML to connect phone calls to your WebSocket server |
| 3 | **WebSocket Message Handling** | Handle real-time events: call setup, caller speech, interrupts, DTMF, errors |
| 4 | **LLM Integration** | Define the system prompt, tools, and tool execution logic for the AI agent |
| 5 | **Conversational Intelligence Setup** | Create an Intelligence Service, custom operators, and enable auto-transcription |
| 6 | **Intelligence Webhook & Operators** | Receive analysis results via webhook and create specialized operators for AI agent evaluation |

## Project Structure

- **`build/`** — The working directory where you write code during the workshop
- **`final/`** — A complete reference implementation you can run if you get stuck
- **`assets/routes.json`** — Transit route data shared by both directories

## End Result

A fully functional, observable voice AI agent that deflects routine inquiries, collects structured data, escalates gracefully, and provides post-call analytics — all running on your local machine and reachable via a real phone number.
