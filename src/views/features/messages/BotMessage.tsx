import React, { useState, useEffect, useRef, useMemo, memo } from "react"
import {
  Text,
  Message as OpenAIMessage,
  MessageDelta,
  ImageFile,
} from "openai/resources/beta/threads/messages"
import {
  FunctionToolCall,
  ToolCall,
} from "openai/resources/beta/threads/runs/steps"
import { OpenAIError } from "openai/error"
import { anonymizeError } from "../../../models/utils/error"
import { StopRespondingButton } from "../../components/buttons/StopRespondingButton"
import { MessageControl } from "./MessageControl"
import { MessageStep } from "./steps/MessageStep"
import { ToolStep } from "./steps/ToolStep"
import { ErrorStep } from "./steps/ErrorStep"
import { Run } from "openai/resources/beta/threads/runs/runs"
import { AssistantStreamEvent } from "openai/resources/beta/assistants"
import { generateMessageId } from "../../../utils/identifiers"
import {
  BotMessageContent,
  UserMessageContent,
} from "../../../typings/messages"
import { UseMessages } from "../../../hooks/useMessages"
import {
  MessageStepContent,
  ToolStepContent,
  ActionStepContent,
  ErrorStepContent,
  TextMessageContent,
} from "../../../typings/steps"
import { serializeError } from "serialize-error"
import { CodeHighlighter } from "../../components/code/CodeHighlighter"
import { message as log } from "../../../utils/loggers"
import { update } from "lodash"
import { RoutingOutputWorkflow } from "../../../models/schemas/routing"
import { ActionType } from "../../../typings/actions"
import { ActionStep } from "./steps/ActionStep"
import { WorkflowStep } from "./steps/WorkflowStep"

// type StepInput = MessageStepContent | ToolStepContent | ErrorStepContent

export interface BotMessageControl {
  setCopyId: (id?: string) => void
  setFunctionCallsCount: (count: number) => void
  addFunctionCallOutput: (tool_call_id: string, output: string) => void
  scrollToEnd: () => void
  pauseScroll: () => void
  resumeScroll: () => void
  getMessage: UseMessages["getMessage"]
  addUserMessage: UseMessages["addUserMessage"]
  addBotMessage: UseMessages["addBotMessage"]
  getBotStep: UseMessages["getBotStep"]
  addBotStep: UseMessages["addBotStep"]
  updateBotStep: UseMessages["updateBotStep"]
  completeBotMessageStep: UseMessages["completeBotMessageStep"]
  updateBotAction: UseMessages["updateBotAction"]
  findLastUserMessage: UseMessages["findLastUserMessage"]
}

interface BotMessageProps {
  content: BotMessageContent
  control: BotMessageControl
  isCopied: boolean
}

export const BotMessage = memo(function BotMessageContent({
  content: { id, stream, steps },
  control: {
    setCopyId,
    setFunctionCallsCount,
    addFunctionCallOutput,
    scrollToEnd,
    pauseScroll,
    resumeScroll,
    addUserMessage,
    addBotMessage,
    getMessage,
    getBotStep,
    addBotStep,
    updateBotStep,
    completeBotMessageStep,
    updateBotAction,
    findLastUserMessage,
  },
  isCopied,
}: BotMessageProps) {
  log("Render bot message", id, { stream, steps }, getMessage(id))
  // const [vote, setVote] = useState(message.vote)
  const currentStepIdRef = useRef<string | undefined>()
  const toolCallCountRef = useRef(0)
  const ref = useRef<HTMLDivElement>(null)
  // const [steps, setSteps] = useState<StepInput[]>(message.steps || [])
  const [unresponsive, setUnresponsive] = useState(false)
  const lastUserMessage = findLastUserMessage(id)
  const states = lastUserMessage?.states

  // useEffect(() => {
  //   setVote(message.vote)
  // }, [message.vote])

  // useEffect(() => {
  //   if (message.content) {
  //     setText(message.content)
  //   }
  // }, [message.content])

  // useEffect(() => {
  //   stepsRef.current = steps
  // }, [steps])

  useEffect(() => {
    if (stream?.on) {
      const handleMessageCreated = async (message: OpenAIMessage) => {
        log("Bot message created", id)
        const stepId = await addBotStep(id, {
          type: "MESSAGE_STEP",
          params: {
            messages: [],
          },
          status: "IN_PROGRESS",
        } as Omit<MessageStepContent, "id" | "messageId" | "timestamp">)
        currentStepIdRef.current = stepId
      }

      const handleMessageDelta = (
        _delta: MessageDelta,
        snapshot: OpenAIMessage,
      ) => {
        const currentStepId = currentStepIdRef.current as string
        log(
          "Bot message delta",
          id,
          currentStepId,
          JSON.stringify(snapshot.content),
        )
        updateBotStep(id, currentStepId, {
          params: {
            messages: snapshot.content.map((message) => {
              switch (message.type) {
                case "text": {
                  return {
                    type: "TEXT" as const,
                    params: {
                      raw: message.text,
                    },
                  }
                }
                default: {
                  throw new Error("Not implemented")
                }
              }
            }),
          },
        } as Partial<MessageStepContent> & Pick<MessageStepContent, "type">)
      }

      const handleMessageDone = () => {
        log("Bot message done", id, currentStepIdRef.current)
        completeBotMessageStep(id, currentStepIdRef.current as string)
      }

      const handleTextDone = async (content: Text) => {}

      const handleImageFileDone = (content: ImageFile) => {
        console.log("imageFileDone", content)
      }

      const handleToolCallDone = async (toolCall: ToolCall) => {
        toolCallCountRef.current += 1
        if (toolCallCountRef.current > 5) {
          throw new Error("Too many tool calls")
        }

        switch (toolCall.type) {
          case "function": {
            const { name, arguments: parameters } =
              toolCall.function as FunctionToolCall["function"]
            await addBotStep(id, {
              type: "TOOL_STEP",
              params: {
                id: toolCall.id,
                name,
                parameters: JSON.parse(parameters),
              },
              status: "IN_PROGRESS",
            } as Omit<ToolStepContent, "id" | "timestamp">)
            // setSteps(_steps)
            break
          }
          default: {
            console.log(`default toolCall: ${toolCall.type}`)
          }
        }
      }

      const handleEvent = async ({ event, data }: AssistantStreamEvent) => {
        switch (event) {
          case "thread.run.failed": {
            await addBotStep(id, {
              type: "ERROR_STEP",
              params: {
                message: "Thread run failed",
                stack: serializeError(data),
              },
              status: "COMPLETED",
            } as Omit<ErrorStepContent, "id" | "timestamp">)
            toolCallCountRef.current = 0
            console.log("thread.run.failed", { event, data })
            break
          }
          case "thread.run.requires_action": {
            const requiredAction = data.required_action as Run.RequiredAction
            switch (requiredAction.type) {
              case "submit_tool_outputs": {
                const { tool_calls } = requiredAction.submit_tool_outputs
                const functionCalls = tool_calls.filter(
                  ({ type }) => type === "function",
                )
                if (functionCalls.length > 0) {
                  setFunctionCallsCount(functionCalls.length)
                }
                break
              }
            }
          }
        }
      }

      const handleAbort = () => {
        // persistMessage({
        //   id: messageId as string,
        //   timestamp: messageTimestamp as string,
        //   type: "BOT_MESSAGE",
        //   content: text,
        // } as any)
        // setStatus("aborted")
      }

      const handleError = (error: OpenAIError) => {
        // console.log("Error", { error })
        // _steps = [
        //   ..._steps,
        //   {
        //     id: generateMessageId(),
        //     type: "ERROR_STEP",
        //     timestamp: new Date().toISOString(),
        //     error: error,
        //     status: "COMPLETED",
        //   },
        // ]
        // setSteps(_steps)
        // setStatus("done")
      }

      const handleEnd = () => {
        console.log("stream end")
      }

      stream
        .on("messageCreated", handleMessageCreated)
        .on("messageDelta", handleMessageDelta)
        .on("messageDone", handleMessageDone)
        .on("textDone", handleTextDone)
        .on("imageFileDone", handleImageFileDone)
        .on("toolCallDone", handleToolCallDone)
        .on("event", handleEvent)
        .on("abort", handleAbort)
        .on("error", handleError)
        .on("end", handleEnd)

      return () => {
        stream
          .off("messageCreated", handleMessageCreated)
          .off("messageDelta", handleMessageDelta)
          .off("messageDone", handleMessageDone)
          .off("textDone", handleTextDone)
          .off("imageFileDone", handleImageFileDone)
          .off("toolCallDone", handleToolCallDone)
          .off("event", handleEvent)
          .off("abort", handleAbort)
          .off("error", handleError)
          .off("end", handleEnd)
      }
    }
  }, [stream])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (steps.length === 0) {
        setUnresponsive(true)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [steps])

  function stopResponding() {
    stream?.abort()
  }

  const messageStepControl = useMemo(
    () => ({
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      updateBotAction,
      getBotStep,
    }),
    [scrollToEnd, pauseScroll, resumeScroll, updateBotAction, getBotStep],
  )

  const toolStepControl = useMemo(
    () => ({
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      updateBotStep,
      addFunctionCallOutput,
    }),
    [
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      updateBotStep,
      addFunctionCallOutput,
    ],
  )

  const actionStepControl = useMemo(
    () => ({
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      addUserMessage,
      addBotMessage,
      getBotStep,
      addBotStep,
      updateBotStep,
      updateBotAction,
      completeBotMessageStep,
      addFunctionCallOutput,
    }),
    [
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      addUserMessage,
      addBotMessage,
      getBotStep,
      addBotStep,
      updateBotStep,
      updateBotAction,
      completeBotMessageStep,
      addFunctionCallOutput,
    ],
  )

  const workflowStepControl = useMemo(
    () => ({
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      getBotStep,
      addBotStep,
      updateBotStep,
      updateBotAction,
    }),
    [
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      getBotStep,
      addBotStep,
      updateBotStep,
      updateBotAction,
    ],
  )

  const errorStepControl = useMemo(
    () => ({
      scrollToEnd,
      pauseScroll,
      resumeScroll,
      updateBotAction,
    }),
    [scrollToEnd, pauseScroll, resumeScroll, updateBotAction],
  )

  if (steps.length === 0) {
    return (
      <div className="p-[15px]">
        {unresponsive ? (
          <div>
            <div>
              Sorry, I am experiencing some connectivity issues. Please wait a
              little longer or try again later.
            </div>
            <div className="dot-flashing "></div>
          </div>
        ) : (
          <div className="p-[15px]">
            <div className="dot-flashing "></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative self-start w-auto max-w-full sm:max-w-[85%] pb-2">
      {steps.map((step) => {
        // return <CodeHighlighter code={JSON.stringify(step)} language="json" />
        switch (step.type) {
          case "MESSAGE_STEP": {
            return (
              <div
                ref={ref}
                className="bg-white p-2 border border-neutral-500 rounded shadow-md text-black break-words my-2"
              >
                <MessageStep content={step} control={messageStepControl} />
                <div className="flex pt-3">
                  {step.status === "IN_PROGRESS" ? (
                    <div className="flex-none flex space-x-2">
                      <StopRespondingButton
                        name="STOP_RESPONDING"
                        status={step.status}
                        utils={{ stopResponding }}
                      />
                    </div>
                  ) : (
                    <div className="flex-auto"></div>
                  )}
                </div>
              </div>
            )
          }
          case "TOOL_STEP": {
            return <ToolStep content={step} control={toolStepControl} />
          }
          case "WORKFLOW_STEP": {
            return <WorkflowStep content={step} control={workflowStepControl} />
          }
          case "ACTION_STEP": {
            return <ActionStep content={step} control={actionStepControl} />
          }
          case "ERROR_STEP": {
            return (
              <div
                ref={ref}
                className="bg-white p-2 border border-neutral-500 rounded shadow-md text-black break-words"
              >
                <ErrorStep content={step} control={errorStepControl} />
              </div>
            )
          }
        }
      })}
    </div>
  )
})
