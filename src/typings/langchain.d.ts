declare module "langchain" {
  const langchain: any
  export default langchain
}

declare module "langchain/*" {
  export const AgentExecutor: any
  export const CallbackManager: any
  export const CallbackManagerForChainRun: any
  export const BaseLanguageModel: any
  export const BaseChain: any
  export const ChainInputs: any
  export const ConversationChain: any
  export const BaseChatMemory: any
  export const ChainValues: any
  export const PromptTemplate: any
  export const ChatPromptTemplate: any
  export const SystemMessagePromptTemplate: any
  export const HumanMessagePromptTemplate: any
  export const MessagesPlaceholder: any
  export const StructuredOutputParser: any
  export const OutputFixingParser: any
  export const JsonOutputFunctionsParser: any
  export const OutputFunctionsParser: any
  export const Tool: any
  export const BufferWindowMemory: any
  const mod: any
  export default mod
}

declare module "@langchain/*" {
  const mod: any
  export default mod
}
