// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import { DangerDSLType } from "danger/distribution/dsl/DangerDSL"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

declare var danger: DangerDSLType

export declare function message(message: string): void

export declare function warn(message: string): void

export declare function fail(message: string): void

export declare function markdown(message: string): void

import { ChatOpenAI } from "@langchain/openai"

type FileOperation = "modified" | "created" | "deleted"

async function getDiffForFiles(fileData: { name: string; operation: FileOperation }[]) {
  const diffs = await Promise.all(
    fileData.map(async file => {
      const diff = await danger.git.diffForFile(file.name)
      return diff ? `### ${file.name} (${file.operation})\n\`\`\`diff\n${diff.before}\n${diff.after}\n\`\`\`` : ""
    })
  )
  return diffs.filter(Boolean).join("\n\n")
}

/**
 * use LLMs to find code smells and common antipatterns before humans review PR
 */
export default async function aiPoweredReview({
  model,
  systemMessage,
  openAIApiKey,
  onlyFreshPRAndExplicitRequests = true,
  explicitRequestCommitMessageSubstring = "AI_REVIEW_NEEDED",
}: {
  model?: string
  systemMessage: string
  openAIApiKey?: string
  onlyFreshPRAndExplicitRequests?: boolean
  explicitRequestCommitMessageSubstring?: string
}) {
  // Get all modified, created, and deleted files
  const modifiedFiles = danger.git.modified_files
  const createdFiles = danger.git.created_files
  const deletedFiles = danger.git.deleted_files
  const latestCommit = danger.github.commits.at(-1)
  if (!latestCommit) {
    return warn("No commits found in PR for AI review")
  }

  const lastCommitMessage = latestCommit.commit.message
  const isFreshPR = new Date(latestCommit.commit.author.date) <= new Date(danger.github.pr.created_at)
  const conductAIPoweredReview = onlyFreshPRAndExplicitRequests
    ? isFreshPR || lastCommitMessage.includes(explicitRequestCommitMessageSubstring)
    : true
  if (!conductAIPoweredReview) {
    return warn("Skipping AI review as PR is not fresh or explicit request is not found in commit message")
  }

  const fileData: {
    name: string
    operation: FileOperation
  }[] = [
    ...modifiedFiles.map(name => ({ name, operation: "modified" as const })),
    ...createdFiles.map(name => ({ name, operation: "created" as const })),
    ...deletedFiles.map(name => ({ name, operation: "deleted" as const })),
  ]

  const chatCompletionClient = new ChatOpenAI({
    model: model || "gpt-4o",
    openAIApiKey: openAIApiKey || process.env.OPENAI_API_KEY,
  })

  const diff = await getDiffForFiles(fileData)
  const messages = [new HumanMessage(`${systemMessage}\nHere is the diff of the PR:\n${diff}`)]

  message(`${(await chatCompletionClient.invoke(messages)).content}`)
}
