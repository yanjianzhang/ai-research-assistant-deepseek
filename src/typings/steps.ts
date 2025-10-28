import { z } from "zod"
import { RoutingOutput } from "../models/schemas/routing"
import { Text } from "openai/resources/beta/threads/messages"
import { serializeError } from "serialize-error"
import { useMessages } from "../hooks/useMessages"
import type {
  ActionType,
  FileActionType,
  SearchActionType,
  QAActionType,
  RetryActionType,
  BaseActionStepControl,
  ErrorActionStepControl,
} from "./actions"
import { SearchWorkflowType, QAWorkflowType } from "./workflows"
import { FileAction } from "../views/features/messages/actions/FileAction"
import { SearchAction } from "../views/features/messages/actions/SearchAction"
import type { recursiveSearchAndCompileResults } from "../apis/zotero/search"

type StepStatus = "IN_PROGRESS" | "COMPLETED"

interface BaseStepContent {
  id: string
  messageId: string
  timestamp: string
  status: StepStatus
}

export interface TextMessageContent {
  type: "TEXT"
  params: {
    raw?: Text
    message?: RoutingOutput["message"]
    context?: RoutingOutput["context"]
    workflows?: ActionType[]
    actions?: ActionType[]
  }
}

export interface ImageMessageContent {
  type: "IMAGE"
  params: string
}

export interface WidgetMessageContent {
  type: "WIDGET"
  params: {
    widget: "search" | "qa"
    message: any
  }
}

export interface MessageStepContent extends BaseStepContent {
  type: "MESSAGE_STEP"
  params: {
    messages: (TextMessageContent | ImageMessageContent | WidgetMessageContent)[]
  }
}

export interface ToolStepContent extends BaseStepContent {
  type: "TOOL_STEP"
  params: {
    id: string // OpenAI tool call ID
    name: string
    parameters: any
    output?: string
  }
}

export interface SearchWorkflowStepContent extends BaseStepContent {
  type: "WORKFLOW_STEP"
  params: {
    workflow: SearchWorkflowType
    context: RoutingOutput["context"],
    searchResultsStepId?: string
    searchResultsCount?: number
  }
}

export interface QAWorkflowStepContent extends BaseStepContent {
  type: "WORKFLOW_STEP"
  params: {

    workflow: QAWorkflowType
    context: RoutingOutput["context"],
    searchResultsStepId?: string
    searchResultsCount?: number
    indexed?: boolean
  }
}

export type WorkflowStepContent = SearchWorkflowStepContent | QAWorkflowStepContent

export interface SearchActionStepContent extends BaseStepContent {
  type: "ACTION_STEP"
  params: {
    action: SearchActionType
    context: RoutingOutput["context"]
    workflow?: any
    output?: any
  }
}

export interface QAActionStepContent extends BaseStepContent {
  type: "ACTION_STEP"
  params: {
    action: QAActionType
    context: RoutingOutput["context"]
    workflow?: any
    output?: any
  }
}

export interface FileActionStepContent extends BaseStepContent {
  type: "ACTION_STEP"
  params: {
    action: FileActionType
    context: RoutingOutput["context"]
    workflow?: any
    output?: any
  }
}

export interface RetryActionStepContent extends BaseStepContent {
  type: "ACTION_STEP"
  params: {
    action: RetryActionType
    context: RoutingOutput["context"]
    workflow?: any
    output?: any
  }
}

export type ActionStepContent = SearchActionStepContent | QAActionStepContent | RetryActionStepContent | FileActionStepContent

export interface ErrorStepContent extends BaseStepContent {
  type: "ERROR_STEP"
  params: {
    message: string
    stack: ReturnType<typeof serializeError>
  }
}

export type StepContent = MessageStepContent | ToolStepContent | ActionStepContent | WorkflowStepContent | ErrorStepContent

interface BaseStepControl {
  scrollToEnd: () => void
  pauseScroll: () => void
  resumeScroll: () => void
}

export interface MessageStepControl extends BaseActionStepControl {
  getBotStep: ReturnType<typeof useMessages>["getBotStep"]
}

export interface ToolStepControl extends BaseStepControl {
  addFunctionCallOutput: (tool_call_id: string, output: string) => void
  updateBotStep: ReturnType<typeof useMessages>["updateBotStep"]
}

export interface ActionStepControl extends BaseActionStepControl {
  addUserMessage: ReturnType<typeof useMessages>["addUserMessage"]
  addBotMessage: ReturnType<typeof useMessages>["addBotMessage"]
  getBotStep: ReturnType<typeof useMessages>["getBotStep"]
  addBotStep: ReturnType<typeof useMessages>["addBotStep"]
  updateBotStep: ReturnType<typeof useMessages>["updateBotStep"]
  completeBotMessageStep: ReturnType<typeof useMessages>["completeBotMessageStep"]
  addFunctionCallOutput: (tool_call_id: string, output: string) => void
}

export interface WorkflowStepControl extends BaseActionStepControl {
  getBotStep: ReturnType<typeof useMessages>["getBotStep"]
  addBotStep: ReturnType<typeof useMessages>["addBotStep"]
  updateBotStep: ReturnType<typeof useMessages>["updateBotStep"]
}

export type ErrorStepControl = ErrorActionStepControl
