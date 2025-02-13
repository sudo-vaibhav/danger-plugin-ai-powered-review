// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import { DangerDSLType } from "danger/distribution/dsl/DangerDSL";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
declare var danger: DangerDSLType;
export declare function message(message: string): void;
export declare function warn(message: string): void;
export declare function fail(message: string): void;
export declare function markdown(message: string): void;
import { ChatOpenAI } from "@langchain/openai";

type FileOperation = "modified" | "created" | "deleted";
async function getDiffForFiles(
  fileData: { name: string; operation: FileOperation }[]
) {
  const diffs = await Promise.all(
    fileData.map(async file => {
      const diff = await danger.git.diffForFile(file.name);
      return diff
        ? `### ${file.name} (${file.operation})\n\`\`\`diff\n${diff.before}\n${diff.after}\n\`\`\``
        : null;
    })
  );
  return diffs.filter(Boolean).join("\n\n");
}

/**
 * use LLMs to find code smells and common anti-patterns before humans review PR
 */
export default async function aiPoweredReview({
  model,
  systemMessage,
  openAIApiKey
}: {
  model?: string;
  systemMessage: string;
  openAIApiKey?: string;
}) {
  // Get all modified, created, and deleted files
  const modifiedFiles = danger.git.modified_files;
  const createdFiles = danger.git.created_files;
  const deletedFiles = danger.git.deleted_files;
  const fileData: {
    name: string;
    operation: FileOperation;
  }[] = [
    ...modifiedFiles.map(name => ({ name, operation: "modified" as const })),
    ...createdFiles.map(name => ({ name, operation: "created" as const })),
    ...deletedFiles.map(name => ({ name, operation: "deleted" as const }))
  ];

  const chatCompletionClient = new ChatOpenAI({
    model: model || "o1",
    openAIApiKey: openAIApiKey || process.env.OPENAI_API_KEY
  });

  const diff = await getDiffForFiles(fileData);
  // const { text: review } = await generateText({
  //   model: model,
  //   prompt:
  //   system: systemMessage
  // });

  const messages = [
    new SystemMessage(systemMessage),
    new HumanMessage(`Here is the diff of the PR: 
    ${diff}
    `)
  ];

  message(`${(await chatCompletionClient.invoke(messages)).content}`);
}
