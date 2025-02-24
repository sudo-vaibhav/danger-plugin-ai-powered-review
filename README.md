# danger-plugin-ai-powered-review

[![Build Status](https://travis-ci.org/sudo-vaibhav/danger-plugin-ai-powered-review.svg?branch=master)](https://travis-ci.org/sudo-vaibhav/danger-plugin-ai-powered-review)
[![npm version](https://badge.fury.io/js/danger-plugin-ai-powered-review.svg)](https://badge.fury.io/js/danger-plugin-ai-powered-review)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

> A Danger.js plugin that uses Large Language Models (LLMs) to automatically detect code smells and common anti-patterns in your Pull Requests before human review.

## Features

- 🤖 Automated code review using LLMs (GPT-4 by default)
- 🔍 Detects code smells and anti-patterns
- ⚡ Reviews only fresh PRs or when explicitly requested
- 🎯 Customizable system prompts for specific review focus
- 🔑 Flexible API key configuration

## Installation

```sh
# npm
npm install danger-plugin-ai-powered-review --save-dev

# yarn
yarn add danger-plugin-ai-powered-review --dev
```

## Usage

Add this to your `dangerfile.js` or `dangerfile.ts`:

```js
import aiPoweredReview from 'danger-plugin-ai-powered-review'

// Basic usage with default options
aiPoweredReview({
  systemMessage: "Review the code for potential issues and suggest improvements.",
  openAIApiKey: "your-api-key" // Or use OPENAI_API_KEY environment variable
})

// Advanced configuration
aiPoweredReview({
  model: "gpt-4", // Specify OpenAI model
  systemMessage: "Focus on security vulnerabilities and performance issues",
  openAIApiKey: process.env.OPENAI_API_KEY,
  onlyFreshPRAndExplicitRequests: true, // Only review fresh PRs or when explicitly requested
  explicitRequestCommitMessageSubstring: "AI_REVIEW_NEEDED" // Custom trigger phrase
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | string | "gpt-4" | OpenAI model to use for review |
| `systemMessage` | string | - | Custom prompt for the AI reviewer |
| `openAIApiKey` | string | process.env.OPENAI_API_KEY | OpenAI API key |
| `onlyFreshPRAndExplicitRequests` | boolean | true | Only review fresh PRs or when explicitly requested |
| `explicitRequestCommitMessageSubstring` | string | "AI_REVIEW_NEEDED" | Substring to trigger review in non-fresh PRs |

### Triggering Reviews

The plugin will automatically review:
1. Fresh PRs (where the latest commit is made before or at PR creation time)
2. PRs with commits containing "AI_REVIEW_NEEDED" (or your custom trigger phrase)

To explicitly request a review on an existing PR:
```sh
git commit -m "refactor: update error handling AI_REVIEW_NEEDED"
```

## Development

1. Clone the repository:
```sh
git clone https://github.com/sudo-vaibhav/danger-plugin-ai-powered-review.git
cd danger-plugin-ai-powered-review
```

2. Install dependencies:
```sh
npm install
```

3. Build the project:
```sh
npm run build
```

4. Run tests:
```sh
npm test
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run Jest tests
- `npm run lint` - Run TSLint
- `npm run prettier-project` - Format code using Prettier
- `npm run docs` - Generate documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## Changelog

See the GitHub [release history](https://github.com/sudo-vaibhav/danger-plugin-ai-powered-review/releases).
