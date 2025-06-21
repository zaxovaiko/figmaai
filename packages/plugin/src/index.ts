figma.showUI(__html__, {
  height: 450,
  width: 450,
  title: 'AI Designer',
  themeColors: true,
  visible: true,
});

const SERVER_URL = 'http://localhost:3000'; // Change this to your deployed server URL

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

interface ServerResponse {
  success: boolean;
  data: DesignResponse;
  timestamp: string;
}

async function generateDesign(prompt: string): Promise<DesignResponse> {
  try {
    const response = await fetch(`${SERVER_URL}/generate-design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const result = (await response.json()) as ServerResponse;

    if (!result.success) {
      throw new Error('Server returned unsuccessful response');
    }

    return result.data;
  } catch (error) {
    console.error('Error communicating with server:', error);
    throw error;
  }
}

async function createFigmaElement(element: DesignElement, _parent?: BaseNode): Promise<SceneNode> {
  let node: SceneNode;

  switch (element.type) {
    case 'frame':
      node = figma.createFrame();
      node.resize(element.width, element.height);
      break;
    case 'rectangle':
      node = figma.createRectangle();
      node.resize(element.width, element.height);
      break;
    case 'text':
      node = figma.createText();
      // Load default font first
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      (node as TextNode).characters = element.text || '';
      if (element.fontSize) {
        (node as TextNode).fontSize = element.fontSize;
      }
      // Set font family and style based on weight
      if (element.fontWeight && element.fontWeight > 500) {
        try {
          await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
          (node as TextNode).fontName = { family: 'Inter', style: 'Bold' };
        } catch (error) {
          // If Bold font isn't available, keep Regular
          console.error('Error loading bold font:', error);
        }
      }
      node.resize(element.width, element.height);
      break;
    case 'ellipse':
      node = figma.createEllipse();
      node.resize(element.width, element.height);
      break;
    case 'line':
      node = figma.createLine();
      node.resize(element.width, element.height);
      break;
    default:
      node = figma.createRectangle();
      node.resize(element.width, element.height);
  }

  node.name = element.name;
  node.x = element.x;
  node.y = element.y;

  // Apply fills if specified
  if (element.fills && 'fills' in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).fills = element.fills.map((fill) => ({
      type: 'SOLID',
      color: fill.color,
    }));
  }

  // Handle children for frame elements
  if (element.children && element.type === 'frame') {
    for (const child of element.children) {
      const childNode = await createFigmaElement(child, node);
      (node as FrameNode).appendChild(childNode);
    }
  }

  return node;
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

figma.ui.onmessage = async (msg: { type: string; text: string }) => {
  if (msg.type === 'submit-text') {
    try {
      figma.notify('Generating design... Please wait.');

      let designResponse: DesignResponse;

      try {
        designResponse = await generateDesign(msg.text);
      } catch (error) {
        console.warn('Server communication failed, using fallback design:', error);
        figma.notify('Server unavailable, using fallback design');
        designResponse = createFallbackDesign(msg.text);
      }

      // Create all elements
      for (const element of designResponse.elements) {
        try {
          const node = await createFigmaElement(element);
          if (element.type === 'frame') {
            figma.currentPage.appendChild(node);
          }
        } catch (elementError) {
          console.warn('Failed to create element:', element.name, elementError);
        }
      }

      // Focus on the created design
      figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);

      figma.notify('Design generated successfully!');
    } catch (error) {
      console.error('Error:', error);
      figma.notify('Error generating design. Please try again.');

      // Fallback design in case of error
      try {
        const fallbackDesign = createFallbackDesign(msg.text);
        const fallbackFrame = await createFigmaElement(fallbackDesign.elements[0]);
        figma.currentPage.appendChild(fallbackFrame);
        figma.viewport.scrollAndZoomIntoView([fallbackFrame]);
      } catch (fallbackError) {
        console.error('Even fallback design failed:', fallbackError);
        figma.notify('Critical error: Please restart the plugin');
      }
    }
  }
};
