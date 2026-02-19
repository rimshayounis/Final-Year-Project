require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function test() {
  const response = await client.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [{ role: 'user', content: 'Hello' }],
  });

  console.log(response.choices[0].message.content);
}

test();
