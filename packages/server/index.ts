import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

interface DesignElement {
  type: 'frame' | 'rectangle' | 'text' | 'ellipse' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  fills?: { type: string; color: { r: number; g: number; b: number } }[];
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  children?: DesignElement[];
}

interface DesignResponse {
  elements: DesignElement[];
  theme: {
    primaryColor: { r: number; g: number; b: number };
    secondaryColor: { r: number; g: number; b: number };
    backgroundColor: { r: number; g: number; b: number };
  };
}

// Fallback design for when API is not available or fails
function createFallbackDesign(prompt: string): DesignResponse {
  return {
    elements: [
      {
        type: 'frame',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        name: 'Fallback Design',
        fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }],
        children: [
          {
            type: 'text',
            x: 20,
            y: 20,
            width: 360,
            height: 40,
            name: 'Title',
            text: 'AI Design Generated',
            fontSize: 24,
            fontWeight: 600,
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }],
          },
          {
            type: 'text',
            x: 20,
            y: 80,
            width: 360,
            height: 60,
            name: 'Description',
            text: `Based on: "${prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt}"`,
            fontSize: 14,
            fontWeight: 400,
            fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }],
          },
          {
            type: 'rectangle',
            x: 20,
            y: 160,
            width: 360,
            height: 120,
            name: 'Content Area',
            fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
          },
        ],
      },
    ],
    theme: {
      primaryColor: { r: 0.2, g: 0.4, b: 0.8 },
      secondaryColor: { r: 0.6, g: 0.6, b: 0.6 },
      backgroundColor: { r: 0.95, g: 0.95, b: 0.95 },
    },
  };
}

async function generateDesign(prompt: string): Promise<DesignResponse> {
  try {
    // Get API key from environment
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    }

    const systemPrompt = `You are a UI/UX designer AI. Generate a valid JSON design specification based on the user's prompt.

RULES:
- Return ONLY valid JSON - no markdown, no backticks, no explanations
- Use practical UI layouts with proper spacing
- Colors in RGB format (0-1 range) 
- Text should be SHORT (max 20 chars)
- Limit to 5 elements maximum
- Use semantic names
- All buttons should have a text label
- All inputs should have a placeholder
- All elements where applicable should have a text description

Example JSON structure:
{
  "elements": [
    {
      "type": "frame",
      "x": 50,
      "y": 50,
      "width": 300,
      "height": 400,
      "name": "Login Form",
      "fills": [{"type": "SOLID", "color": {"r": 0.98, "g": 0.98, "b": 0.98}}],
      "children": [
        {
          "type": "text",
          "x": 20,
          "y": 20,
          "width": 260,
          "height": 30,
          "name": "Title",
          "text": "Login",
          "fontSize": 24
        }
      ]
    }
  ],
  "theme": {
    "primaryColor": {"r": 0.2, "g": 0.4, "b": 0.8},
    "secondaryColor": {"r": 0.6, "g": 0.6, "b": 0.6},
    "backgroundColor": {"r": 0.98, "g": 0.98, "b": 0.98}
  }
}`;

    const result = await generateText({
      model: createGoogleGenerativeAI({ apiKey })('gemini-2.0-flash'),
      prompt,
      system: systemPrompt,
      maxTokens: 3000,
      temperature: 0.8,
    });

    // Clean the response text (remove markdown backticks if present)
    let cleanText = result.text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }

    const parsedResult = JSON.parse(cleanText);
    return parsedResult as DesignResponse;
  } catch (error) {
    console.error('Error generating design:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    message: 'FigmaAI Server is running!',
    timestamp: new Date().toISOString(),
  });
});

// Generate design endpoint
app.post('/generate-design', async (c) => {
  try {
    const body = await c.req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Prompt is required and must be a string' }, 400);
    }

    console.log('Generating design for prompt:', prompt);

    let designResponse: DesignResponse;

    try {
      designResponse = await generateDesign(prompt);
      console.log('AI design generated successfully');
    } catch (error) {
      console.warn('AI generation failed, using fallback design:', error);
      designResponse = createFallbackDesign(prompt);
    }

    return c.json({
      success: true,
      data: designResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Server error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Example prompts endpoint
app.get('/examples', (c) => {
  const examples = [
    'Create a modern login form with email and password fields, blue accent color',
    'Design a pricing card with three tiers (Basic, Pro, Premium)',
    'Make a header with logo placeholder and navigation menu',
    'Create a mobile app onboarding screen with welcome message',
    'Design a contact form with name, email, message fields and submit button',
    'Create a dashboard card showing sales statistics',
    'Design a profile card with avatar, name, role, and contact buttons',
    'Make a landing page hero section with title, subtitle, and CTA button',
  ];

  return c.json({ examples });
});

const port = process.env.PORT || 3000;

console.log(`🚀 FigmaAI Server starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
