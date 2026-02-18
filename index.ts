import type { Plugin } from "@opencode-ai/plugin"
import { appendFileSync } from "fs"

const DEBUG_ENABLED = true
const DEBUG_LOG = "/tmp/opencode-copilot-agent-header-debug.log"
const MESSAGE_LOOKBACK_LIMIT = 10
const DEFAULT_FIRST_MESSAGE_AGENT_PERCENT = 0
const DEFAULT_FOLLOWUP_MESSAGE_AGENT_PERCENT = 100

function formatError(error: unknown) {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function log(message: string) {
  if (!DEBUG_ENABLED) return
  try {
    const timestamp = new Date().toISOString()
    appendFileSync(DEBUG_LOG, `${timestamp} ${message}\n`)
  } catch {}
}

function getPercent(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function sampleInitiator(agentPercent: number) {
  const randomPercent = Math.random() * 100
  return randomPercent < agentPercent ? "agent" : "user"
}

function hasAssistantOrToolMessages(messages: any[]) {
  return messages.some((message) => {
    const role = message?.info?.role
    if (role === "assistant" || role === "tool") return true

    if (Array.isArray(message?.parts)) {
      return message.parts.some((part: any) => part?.type === "tool")
    }

    return false
  })
}

function getPriorMessages(messages: any[], incoming: any) {
  const currentMessageID = incoming?.message?.id
  const currentCreated = incoming?.message?.time?.created

  return messages.filter((message) => {
    const info = message?.info
    const messageID = info?.id

    if (currentMessageID && messageID === currentMessageID) return false
    if (currentMessageID && info?.role === "assistant" && info?.parentID === currentMessageID) return false

    if (typeof currentCreated === "number") {
      const created = info?.time?.created
      if (typeof created === "number") {
        return created < currentCreated
      }
    }

    return true
  })
}

async function loadSessionMessages(client: any, sessionID: string, directory: string | undefined) {
  try {
    const response = await client.session.messages({
      path: { id: sessionID },
      query: {
        limit: MESSAGE_LOOKBACK_LIMIT,
        ...(directory ? { directory } : {}),
      },
      throwOnError: true,
    })

    if (Array.isArray(response?.data)) {
      return {
        messages: response.data,
        ok: true,
      }
    }

    log("[HEADERS] session.messages returned no data")
  } catch (error) {
    const reason = formatError(error)
    log(`[HEADERS] session.messages failed: ${reason}`)
  }

  return {
    messages: [],
    ok: false,
  }
}

const CopilotForceAgentHeader: Plugin = async ({ client, directory }: any) => {
  log("[INIT] Copilot Force Agent Header plugin loaded (chat.headers mode)")

  return {
    "chat.headers": async (incoming: any, output: any) => {
      if (!incoming.model.providerID.includes("github-copilot")) return

      const sessionID = incoming.sessionID ?? incoming.sessionId ?? incoming.session?.id

      let isNonFirstMessage = false
      let loadedHistory = false
      const providerOptions = incoming?.provider?.options ?? {}
      const firstMessageAgentPercent = getPercent(
        providerOptions?.firstMessageAgentPercent,
        DEFAULT_FIRST_MESSAGE_AGENT_PERCENT,
      )
      const followupMessageAgentPercent = getPercent(
        providerOptions?.followupMessageAgentPercent,
        DEFAULT_FOLLOWUP_MESSAGE_AGENT_PERCENT,
      )

      if (typeof sessionID === "string" && sessionID.length > 0) {
        try {
          const history = await loadSessionMessages(client, sessionID, directory)
          const messages = history.messages
          const priorMessages = getPriorMessages(messages, incoming)
          loadedHistory = history.ok
          isNonFirstMessage = hasAssistantOrToolMessages(priorMessages)
        } catch (error) {
          const reason = formatError(error)
          log(`[HEADERS] Failed loading session messages: ${reason}`)
        }
      } else {
        log("[HEADERS] Missing sessionID in incoming payload")
      }

      let initiator = "agent"

      if (!loadedHistory) {
        initiator = "agent"
      } else if (isNonFirstMessage) {
        initiator = sampleInitiator(followupMessageAgentPercent)
      } else {
        initiator = sampleInitiator(firstMessageAgentPercent)
      }

      output.headers ||= {}
      output.headers["x-initiator"] = initiator
      log(`[HEADERS] x-initiator=${initiator}`)
    },
  }
}

export default CopilotForceAgentHeader
