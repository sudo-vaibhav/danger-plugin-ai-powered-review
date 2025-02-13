import aiPoweredReview from "./index";
import { ChatOpenAI } from "@langchain/openai";

// Mock the ChatOpenAI class to control its output
jest.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue({ content: "Mocked AI review" })
      };
    })
  };
});

declare const global: any;

describe("aiPoweredReview()", () => {
  beforeEach(() => {
    // Set up the global functions that the module uses
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
  });

  afterEach(() => {
    global.warn = undefined;
    global.message = undefined;
    global.fail = undefined;
    global.markdown = undefined;
    global.danger = undefined;
    jest.clearAllMocks();
  });

  it("calls global.message with the AI review output when a diff is available", async () => {
    // Arrange: simulate one modified file with an available diff
    global.danger.git.modified_files = ["file1.js"];
    global.danger.git.created_files = [];
    global.danger.git.deleted_files = [];
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code"
    });

    const model = "any-model";
    const systemMessage = "System message for diff available case";

    // Act
    await aiPoweredReview({ model, systemMessage });

    // Assert: our mocked ChatOpenAI returns "Mocked AI review"
    expect(global.message).toHaveBeenCalledWith("Mocked AI review");

    // Also verify that ChatOpenAI was instantiated with the hard-coded model "o1"
    expect(ChatOpenAI).toHaveBeenCalledWith({ model: "o1" });
  });

  it("calls global.message with the AI review output when no diff is available", async () => {
    // Arrange: simulate one modified file but diffForFile returns null (no diff)
    global.danger.git.modified_files = ["file1.js"];
    global.danger.git.created_files = [];
    global.danger.git.deleted_files = [];
    global.danger.git.diffForFile.mockResolvedValue(null);

    const model = "any-model";
    const systemMessage = "System message for no diff case";

    // Act
    await aiPoweredReview({ model, systemMessage });

    // Assert: even when no diff is available, the AI client returns our mocked output
    expect(global.message).toHaveBeenCalledWith("Mocked AI review");
    expect(ChatOpenAI).toHaveBeenCalledWith({ model: "o1" });
  });
});
