const axios = require('axios');
const { pool } = require('../database');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Function to generate thumbnail ideas using OpenRouter with function calling
async function generateIdeas(titleId, titleText, instructions, previousIdeas = []) {
  try {
    if (!titleId) {
      throw new Error('Title ID is required for idea generation');
    }
    
    if (!titleText) {
      throw new Error('Title text is required for idea generation');
    }
    
    // Get previous ideas for context
    const previousIdeasSummary = previousIdeas.length > 0 
      ? `Previous thumbnail ideas: ${previousIdeas.map(idea => idea.summary).join('; ')}`
      : '';
    
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key is missing. Please check your .env file.');
    }
    
    const response = await axios.post(OPENROUTER_URL, {
      model: 'google/gemini-2.5-pro-preview', // You can choose a different model
      messages: [
        { role: 'system', content: 'You are a creative thumbnail designer. Generate unique thumbnail concepts that haven\'t been suggested before.' },
        { role: 'user', content: `Create a thumbnail concept for the title: "${titleText}".
          ${instructions ? `Custom instructions: ${instructions}` : ''}
          ${previousIdeasSummary}
          Please generate a completely new and different thumbnail idea that hasn't been suggested yet.`
        }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'saveThumbnailIdea',
          description: 'Save a thumbnail idea',
          parameters: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'A short summary of the thumbnail idea (30-50 words)'
              },
              fullPrompt: {
                type: 'string',
                description: 'The full prompt to generate this thumbnail image (100-200 words with detailed visual instructions)'
              }
            },
            required: ['summary', 'fullPrompt']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'saveThumbnailIdea' } }
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

      // 1) make sure we got at least one choice
      const choices = response.data?.choices;
      if (!Array.isArray(choices) || choices.length === 0) {
        console.error('OpenRouter returned no choices:', response.data);
        throw new Error('AI returned no choices');
      }
    // const toolCall = response.data.choices[0].message.tool_calls[0];
    const message = choices[0].message;
    const calls = message?.tool_calls;
    const ideaData = JSON.parse(calls[0].function.arguments);

    if (!ideaData.summary || !ideaData.fullPrompt) {
      throw new Error('Incomplete idea data received from AI');
    }

    // Save to database
    const params = [titleId, ideaData.summary, ideaData.fullPrompt];
    // Validate parameters
    if (params.some(p => p === undefined)) {
      console.error('Attempted to execute query with undefined parameter:', { params });
      throw new Error('Invalid query parameter detected');
    }
    
    const [result] = await pool.execute(
      'INSERT INTO ideas (title_id, summary, full_prompt) VALUES (?, ?, ?)',
      params
    );

    const idea = {
      id: result.insertId,
      titleId,
      summary: ideaData.summary,
      fullPrompt: ideaData.fullPrompt
    };

    return idea;
  } catch (error) {
    console.error('Error generating ideas:', error);
    throw error;
  }
}

module.exports = { generateIdeas }; 