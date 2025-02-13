import aiPoweredReview from "./index";
import { ChatOpenAI } from "@langchain/openai";

// Mock the ChatOpenAI class to control its output and capture its instantiation parameters
jest.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(config => {
      return {
        invoke: jest.fn().mockResolvedValue({ content: "Mocked AI review" })
      };
    })
  };
});

declare const global: any;

describe("aiPoweredReview()", () => {
  beforeEach(() => {
    // Initialize global functions
    global.warn = jest.fn();
    global.message = jest.fn();
    global.fail = jest.fn();
    global.markdown = jest.fn();

    // Set up the danger global with a git object
    global.danger = {
      git: {
        modified_files: [],
        created_files: [],
        deleted_files: [],
        diffForFile: jest.fn()
      }
    };

    // Ensure process.env has an API key for tests when one isn't provided
    process.env.OPENAI_API_KEY = "env-api-key";
  });

  afterEach(() => {
    global.warn = undefined;
    global.message = undefined;
    global.fail = undefined;
    global.markdown = undefined;
    global.danger = undefined;
    jest.clearAllMocks();
  });

  it("calls global.message with AI review output when both model and openAIApiKey are provided", async () => {
    // Arrange: simulate one modified file with a valid diff
    global.danger.git.modified_files = ["file1.js"];
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code"
    });
    const model = "my-model";
    const systemMessage = "System message for provided params";
    const openAIApiKey = "provided-api-key";

    // Act
    await aiPoweredReview({ model, systemMessage, openAIApiKey });

    // Assert: global.message should be called with the LLM's output
    expect(global.message).toHaveBeenCalledWith("Mocked AI review");

    // And ChatOpenAI should be instantiated with the provided parameters
    expect(ChatOpenAI).toHaveBeenCalledWith({ model, openAIApiKey });
  });

  it("calls global.message with AI review output using the env API key when openAIApiKey is omitted", async () => {
    // Arrange: simulate one modified file with a valid diff
    global.danger.git.modified_files = ["file1.js"];
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code"
    });
    const model = "another-model";
    const systemMessage = "System message without provided API key";

    // Act
    await aiPoweredReview({ model, systemMessage });

    // Assert: global.message should be called with the LLM's output
    expect(global.message).toHaveBeenCalledWith("Mocked AI review");

    // And ChatOpenAI should fall back to using process.env.OPENAI_API_KEY
    expect(ChatOpenAI).toHaveBeenCalledWith({
      model,
      openAIApiKey: "env-api-key"
    });
  });

  it("calls global.message with AI review output when model is omitted", async () => {
    // Arrange: simulate one modified file with a valid diff
    global.danger.git.modified_files = ["file1.js"];
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code"
    });
    const systemMessage = "System message without model";

    // Act
    await aiPoweredReview({ systemMessage });

    // Assert: global.message should be called with the LLM's output
    expect(global.message).toHaveBeenCalledWith("Mocked AI review");

    // And ChatOpenAI should be instantiated with model as undefined and using the env API key
    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: "o1",
      openAIApiKey: "env-api-key"
    });
  });

  it("calls global.message with AI review output when no diff is available", async () => {
    // Arrange: simulate a file where diffForFile returns null
    global.danger.git.modified_files = ["file1.js"];
    global.danger.git.diffForFile.mockResolvedValue(null);
    const model = "test-model";
    const systemMessage = "System message when no diff exists";
    const openAIApiKey = "provided-api-key";

    // Act
    await aiPoweredReview({ model, systemMessage, openAIApiKey });

    // Assert: even without a diff, the LLM returns our mocked response
    expect(global.message).toHaveBeenCalledWith("Mocked AI review");
    expect(ChatOpenAI).toHaveBeenCalledWith({ model, openAIApiKey });
  });
});
