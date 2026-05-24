import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
// Using the recommended server-side initialization schema
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log('Gemini API Client initialized successfully.');
} else {
  console.warn('GEMINI_API_KEY is not defined in the environment. FlowMotion will fall back to local rule-based parsing.');
}

// Check availability of Gemini API endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!ai,
    message: ai ? 'AI Parsing service connected.' : 'Local fallback parser active.'
  });
});

// AI Parsing endpoint
app.post('/api/parse-diagram', async (req, res) => {
  const { text } = req.body;
  
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text request body is required.' });
  }

  if (!ai) {
    return res.status(200).json({
      fallback: true,
      message: 'GEMINI_API_KEY environment variable is not defined. Falling back to high-fidelity client-side local parser.'
    });
  }

  try {
    const prompt = `Analyze this technical explanation, tutorial, or network requirement and parse it into an interactive 2D diagram model.
Text: "${text}"

Rules:
1. Extract distinct architectural nodes (e.g. servers, browsers, databases, caches, cars, gateway, firewall).
2. Plural Grammar Instantiation: If a noun element ends with 's' or 'es' indicating a plural noun and no quantity is specified, automatically generate a group of 2 to 5 distinct node objects representing that asset with staggered coordinates to model clusters.
3. Middleware & Firewalls: If a firewall or security layer is mentioned protecting a system, ensure the firewall is placed physically between the client/attacker and the system, routing connections through the firewall.
4. Set animated packet objects representing flows. Parse "requests" or "traffic stream" as continuous by setting "isContinuous": true inside the packet items. If the text does not mention "packet" or "package", set "isLightOrb": true on packets to style them as sleek glowing particles instead of text-labeled boxes.
5. Overwhelm Crash Scenario: If raw text describes server overwhelm/crashing/ddos, set "isOverwhelmScenario": true on the top-level diagram, and set "isOverwhelmTarget": true on corresponding victim server node.
6. Provide realistic technical details (IPs, Ports, statuses e.g. 'Active', 'Listening', 'Ready') inside fields or details array.

Strict JSON format:
Ensure the response matches the required schema perfectly. Do not output markdown backticks wrapping the JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['name', 'description', 'nodes', 'edges', 'packets'],
          properties: {
            name: {
              type: Type.STRING,
              description: 'Short descriptive named title for this diagram'
            },
            description: {
              type: Type.STRING,
              description: 'A 1-2 sentence description explaining what system we see'
            },
            nodes: {
              type: Type.ARRAY,
              description: 'List of systems, devices, or actors in the diagram',
              items: {
                type: Type.OBJECT,
                required: ['id', 'label', 'type', 'x', 'y', 'statusLabel'],
                properties: {
                  id: { type: Type.STRING, description: 'Unique slug ID like node_web' },
                  label: { type: Type.STRING, description: 'Human readable system label' },
                  type: {
                    type: Type.STRING,
                    description: 'Type of entity icon to render',
                    enum: ['client', 'browser', 'server', 'database', 'cloud', 'car', 'cache', 'gateway', 'firewall']
                  },
                  x: { type: Type.INTEGER, description: 'Percentage coordinate x-axis (10 to 90)' },
                  y: { type: Type.INTEGER, description: 'Percentage coordinate y-axis (15 to 85)' },
                  ip: { type: Type.STRING, description: 'Optional IP address' },
                  port: { type: Type.INTEGER, description: 'Optional network port number' },
                  statusLabel: { type: Type.STRING, description: 'Active status string like listening or active' },
                  isOverwhelmTarget: { type: Type.BOOLEAN, description: 'True if this node is being actively overloaded' },
                  details: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Small settings attributes list'
                  }
                }
              }
            },
            edges: {
              type: Type.ARRAY,
              description: 'Static channel connection lines between nodes',
              items: {
                type: Type.OBJECT,
                required: ['id', 'from', 'to'],
                properties: {
                  id: { type: Type.STRING },
                  from: { type: Type.STRING, description: 'Source node ID matching one of nodes.id' },
                  to: { type: Type.STRING, description: 'Destination node ID matching one of nodes.id' },
                  label: { type: Type.STRING, description: 'Label detail on the link itself' },
                  lineStyle: {
                    type: Type.STRING,
                    enum: ['solid', 'dashed']
                  },
                  isBidirectional: { type: Type.BOOLEAN }
                }
              }
            },
            packets: {
              type: Type.ARRAY,
              description: 'In-flight animated packet transfers',
              items: {
                type: Type.OBJECT,
                required: ['from', 'to', 'label'],
                properties: {
                  from: { type: Type.STRING, description: 'Origin node ID matching nodes.id`' },
                  to: { type: Type.STRING, description: 'Target node ID matching nodes.id`' },
                  label: { type: Type.STRING, description: 'Data packet label' },
                  color: { type: Type.STRING, description: 'Glow hex color code e.g. #38bdf8' },
                  speed: { type: Type.NUMBER, description: 'Floating increment speed parameter (suggest 0.005 to 0.015)' },
                  isContinuous: { type: Type.BOOLEAN, description: 'True if flow is overlapping stream' },
                  isLightOrb: { type: Type.BOOLEAN, description: 'True if should render as pure glowing light orb' }
                }
              }
            },
            isContinuousStream: { type: Type.BOOLEAN, description: 'True if client-attacker diagram has overlapping traffic queues active' },
            isOverwhelmScenario: { type: Type.BOOLEAN, description: 'True if victim nodes crash and freeze streams' }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json(parsedData);

  } catch (err: any) {
    console.error('Gemini extraction failure:', err);
    res.status(500).json({
      error: 'Failed to extract diagram model from text via Gemini.',
      details: err.message || err
    });
  }
});

// Configure Vite and Asset static servers
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server loaded via middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production server listening static assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlowMotion AI Service booted on http://0.0.0.0:${PORT}`);
  });
}

startServer();
