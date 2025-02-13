import aiPoweredReview from "./index";
import { generateText, LanguageModelV1 } from "ai";
// Create a dummy model conforming to LanguageModelV1
const dummyModel = {
  specificationVersion: "v1",
  provider: "dummy",
  modelId: "dummy-model-id",
  defaultObjectGenerationMode: undefined,
  async doGenerate(options) {
    return {
      text: "AI generated review text",
      finishReason: "stop",
      usage: { promptTokens: 0, completionTokens: 0 },
      rawCall: { rawPrompt: null, rawSettings: {} }
    };
  },
  async doStream(options) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: "text-delta",
          textDelta: "AI generated review text"
        });
        controller.enqueue({
          type: "finish",
          finishReason: "stop",
          usage: { promptTokens: 0, completionTokens: 0 }
        });
        controller.close();
      }
    });
    return { stream, rawCall: { rawPrompt: null, rawSettings: {} } };
  }
} satisfies LanguageModelV1;
// Mock the generateText function from the "ai" module.
jest.mock("ai", () => ({
  generateText: jest.fn()
}));

declare const global: any;

describe("aiPoweredReview()", () => {
  beforeEach(() => {
    // Stub out Danger's messaging functions.
    global.warn = jest.fn();
    global.message = jest.fn();
    global.fail = jest.fn();
    global.markdown = jest.fn();

    // Set up a fake danger object with a PR title and file lists.
    global.danger = {
      github: {
        pr: { title: "My Test Title" }
      },
      git: {
        modified_files: ["file1.js"],
        created_files: ["file2.js"],
        deleted_files: ["file3.js"],
        // Stub diffForFile to return a dummy diff object for each file.
        diffForFile: jest.fn((fileName: string) => {
          if (fileName === "file1.js") {
            return Promise.resolve({
              before: "old code 1",
              after: "new code 1"
            });
          } else if (fileName === "file2.js") {
            return Promise.resolve({
              before: "old code 2",
              after: "new code 2"
            });
          } else if (fileName === "file3.js") {
            return Promise.resolve({
              before: "old code 3",
              after: "new code 3"
            });
          }
          return Promise.resolve(null);
        })
      }
    };

    // Make generateText resolve with a predictable review text.
    (generateText as jest.Mock).mockResolvedValue({
      text: "AI generated review text"
    });
  });

  afterEach(() => {
    global.warn = undefined;
    global.message = undefined;
    global.fail = undefined;
    global.markdown = undefined;
    global.danger = undefined;
    jest.resetAllMocks();
  });

  it("calls message with the AI generated review text", async () => {
    await aiPoweredReview({
      model: dummyModel,
      systemMessage: "Test system prompt"
    });

    expect(global.message).toHaveBeenCalledWith("AI generated review text");
  });

  it("generates a prompt that includes the diffs for all files", async () => {
    await aiPoweredReview({
      model: dummyModel,
      systemMessage: "Test system prompt"
    });

    // Capture the first call's prompt argument passed to generateText.
    const promptArg = (generateText as jest.Mock).mock.calls[0][0].prompt;

    // Verify that the prompt contains the expected diff sections for each file.
    expect(promptArg).toMatch(/### file1\.js \(modified\)/);
    expect(promptArg).toMatch(/old code 1/);
    expect(promptArg).toMatch(/new code 1/);

    expect(promptArg).toMatch(/### file2\.js \(created\)/);
    expect(promptArg).toMatch(/old code 2/);
    expect(promptArg).toMatch(/new code 2/);

    expect(promptArg).toMatch(/### file3\.js \(deleted\)/);
    expect(promptArg).toMatch(/old code 3/);
    expect(promptArg).toMatch(/new code 3/);
  });
});
