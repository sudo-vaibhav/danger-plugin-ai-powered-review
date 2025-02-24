import aiPoweredReview from "./index"
import { ChatOpenAI } from "@langchain/openai"

// Mock the ChatOpenAI class to control its output and capture its instantiation parameters
jest.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: jest.fn().mockImplementation(config => {
      return {
        invoke: jest.fn().mockResolvedValue({ content: "Mocked AI review" }),
      }
    }),
  }
})

declare const global: any

describe("aiPoweredReview()", () => {
  beforeEach(() => {
    // Initialize global functions
    global.warn = jest.fn()
    global.message = jest.fn()
    global.fail = jest.fn()
    global.markdown = jest.fn()

    // Set up the danger global with git and github objects
    global.danger = {
      git: {
        modified_files: [],
        created_files: [],
        deleted_files: [],
        diffForFile: jest.fn(),
      },
      github: {
        commits: [],
        pr: {
          created_at: new Date().toISOString(),
        },
      },
    }

    // Ensure process.env has an API key for tests when one isn't provided
    process.env.OPENAI_API_KEY = "env-api-key"
  })

  afterEach(() => {
    global.warn = undefined
    global.message = undefined
    global.fail = undefined
    global.markdown = undefined
    global.danger = undefined
    jest.clearAllMocks()
  })

  it("calls global.message with AI review output when both model and openAIApiKey are provided", async () => {
    // Arrange: simulate one modified file with a valid diff and a fresh commit
    global.danger.git.modified_files = ["file1.js"]
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code",
    })
    const pastDate = new Date(Date.now() - 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "Regular commit message",
          author: { date: pastDate },
        },
      },
    ]
    const model = "my-model"
    const systemMessage = "System message for provided params"
    const openAIApiKey = "provided-api-key"

    // Act
    await aiPoweredReview({ model, systemMessage, openAIApiKey })

    // Assert: global.message should be called with the LLM's output and ChatOpenAI should use the provided parameters
    expect(global.message).toHaveBeenCalledWith("Mocked AI review")
    expect(ChatOpenAI).toHaveBeenCalledWith({ model, openAIApiKey })
  })

  it("calls global.message with AI review output using the env API key when openAIApiKey is omitted", async () => {
    // Arrange: simulate one modified file with a valid diff and a fresh commit
    global.danger.git.modified_files = ["file1.js"]
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code",
    })
    const pastDate = new Date(Date.now() - 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "Regular commit message",
          author: { date: pastDate },
        },
      },
    ]
    const model = "another-model"
    const systemMessage = "System message without provided API key"

    // Act
    await aiPoweredReview({ model, systemMessage })

    // Assert: ChatOpenAI should use process.env.OPENAI_API_KEY
    expect(global.message).toHaveBeenCalledWith("Mocked AI review")
    expect(ChatOpenAI).toHaveBeenCalledWith({
      model,
      openAIApiKey: "env-api-key",
    })
  })

  it("calls global.message with AI review output when model is omitted", async () => {
    // Arrange: simulate one modified file with a valid diff and a fresh commit
    global.danger.git.modified_files = ["file1.js"]
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code",
    })
    const pastDate = new Date(Date.now() - 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "Regular commit message",
          author: { date: pastDate },
        },
      },
    ]
    const systemMessage = "System message without model"

    // Act
    await aiPoweredReview({ systemMessage })

    // Assert: ChatOpenAI should be instantiated with the default model "gpt-4o"
    expect(global.message).toHaveBeenCalledWith("Mocked AI review")
    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: "gpt-4o",
      openAIApiKey: "env-api-key",
    })
  })

  it("calls global.message with AI review output when no diff is available", async () => {
    // Arrange: simulate a modified file where diffForFile returns null and a fresh commit
    global.danger.git.modified_files = ["file1.js"]
    global.danger.git.diffForFile.mockResolvedValue(null)
    const pastDate = new Date(Date.now() - 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "Regular commit message",
          author: { date: pastDate },
        },
      },
    ]
    const model = "test-model"
    const systemMessage = "System message when no diff exists"
    const openAIApiKey = "provided-api-key"

    // Act
    await aiPoweredReview({ model, systemMessage, openAIApiKey })

    // Assert: even without a diff, the LLM returns our mocked response
    expect(global.message).toHaveBeenCalledWith("Mocked AI review")
    expect(ChatOpenAI).toHaveBeenCalledWith({ model, openAIApiKey })
  })

  it("warns when no commits are found", async () => {
    // Arrange: simulate no commits present
    global.danger.github.commits = []
    const systemMessage = "System message"

    // Act
    await aiPoweredReview({ systemMessage })

    // Assert: global.warn should be called with the appropriate message
    expect(global.warn).toHaveBeenCalledWith("No commits found in PR for AI review")
  })

  it("warns and skips AI review if PR is not fresh and explicit flag is missing", async () => {
    // Arrange: simulate a commit that is not fresh (author date in the future)
    const futureDate = new Date(Date.now() + 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "Regular commit message",
          author: { date: futureDate },
        },
      },
    ]
    global.danger.github.pr.created_at = new Date().toISOString()
    const systemMessage = "System message"

    // Act
    await aiPoweredReview({ systemMessage })

    // Assert: global.warn should indicate that AI review is skipped
    expect(global.warn).toHaveBeenCalledWith(
      "Skipping AI review as PR is not fresh or explicit request is not found in commit message"
    )
  })

  it("proceeds with AI review if commit message contains explicit request substring even if not fresh", async () => {
    // Arrange: simulate a commit that is not fresh but includes the explicit flag
    const futureDate = new Date(Date.now() + 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "This commit has AI_REVIEW_NEEDED flag",
          author: { date: futureDate },
        },
      },
    ]
    global.danger.git.modified_files = ["file1.js"]
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code",
    })
    global.danger.github.pr.created_at = new Date().toISOString()
    const systemMessage = "System message with explicit flag"

    // Act
    await aiPoweredReview({ systemMessage })

    // Assert: AI review proceeds because of the explicit flag
    expect(global.message).toHaveBeenCalledWith("Mocked AI review")
  })

  it("bypasses freshness check when onlyFreshPRAndExplicitRequests is false", async () => {
    // Arrange: simulate a commit that is not fresh and does not include the explicit flag
    const futureDate = new Date(Date.now() + 10000).toISOString()
    global.danger.github.commits = [
      {
        commit: {
          message: "Regular commit without flag",
          author: { date: futureDate },
        },
      },
    ]
    global.danger.git.modified_files = ["file1.js"]
    global.danger.git.diffForFile.mockResolvedValue({
      before: "old code",
      after: "new code",
    })
    global.danger.github.pr.created_at = new Date().toISOString()
    const model = "custom-model"
    const systemMessage = "System message with bypass"
    const openAIApiKey = "provided-api-key"

    // Act
    await aiPoweredReview({ model, systemMessage, openAIApiKey, onlyFreshPRAndExplicitRequests: false })

    // Assert: AI review proceeds even though the commit is not fresh and lacks the explicit flag
    expect(global.message).toHaveBeenCalledWith("Mocked AI review")
    expect(ChatOpenAI).toHaveBeenCalledWith({ model, openAIApiKey })
  })
})
