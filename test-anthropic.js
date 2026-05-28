const { Anthropic } = require("@anthropic-ai/sdk");
require('dotenv').config({ path: '.env.local' });
console.log("Starting test with CLAUDE_MODEL=" + process.env.CLAUDE_MODEL);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
async function run() {
  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [{ role: "user", content: "hello" }]
    });
    console.log("Success:", response);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
