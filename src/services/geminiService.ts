import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.warn('Gemini AI not available — search will use fallback');
}

// Fallback locations for when Gemini is not available
const KIGALI_LOCATIONS: Record<string, { name: string; lat: number; lng: number; description: string }[]> = {
  'kimironko': [{ name: 'Kimironko Market', lat: -1.9536, lng: 30.0936, description: 'Major market in Kimironko, Kigali' }],
  'nyabugogo': [{ name: 'Nyabugogo Bus Park', lat: -1.9395, lng: 30.0550, description: 'Main bus terminal in Nyabugogo' }],
  'remera': [{ name: 'Remera Taxi Park', lat: -1.9585, lng: 30.1044, description: 'Taxi and bus park in Remera' }],
  'cbd': [{ name: 'CBD (City Center)', lat: -1.9441, lng: 30.0619, description: 'Kigali Central Business District' }],
  'kicukiro': [{ name: 'Kicukiro Centre', lat: -1.9750, lng: 30.0900, description: 'Kicukiro district center' }],
  'nyamirambo': [{ name: 'Nyamirambo', lat: -1.9800, lng: 30.0450, description: 'Nyamirambo neighborhood' }],
  'gisozi': [{ name: 'Gisozi', lat: -1.9200, lng: 30.0600, description: 'Gisozi area, northern Kigali' }],
  'gishushu': [{ name: 'Gishushu', lat: -1.9530, lng: 30.0980, description: 'Gishushu commercial area' }],
  'sonatubes': [{ name: 'Sonatubes', lat: -1.9650, lng: 30.1000, description: 'Sonatubes area, eastern Kigali' }],
  'kigali': [{ name: 'Kigali City Center', lat: -1.9441, lng: 30.0619, description: 'Capital city of Rwanda' }],
};

function fallbackSearch(query: string) {
  const q = query.toLowerCase();
  for (const [key, locations] of Object.entries(KIGALI_LOCATIONS)) {
    if (q.includes(key)) {
      return { text: `Found results for "${query}"`, locations };
    }
  }
  // Return closest match or city center
  return {
    text: `No exact match for "${query}". Showing Kigali center.`,
    locations: [{ name: query, lat: -1.9441, lng: 30.0619, description: 'Kigali, Rwanda' }],
  };
}

export async function searchDestination(query: string, userLocation?: { lat: number; lng: number }) {
  if (!ai) {
    return fallbackSearch(query);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find the location for: "${query}" in Kigali, Rwanda. 
      You MUST return a JSON block formatted exactly like this:
      \`\`\`json
      [
        { "name": "Location Name", "lat": -1.9536, "lng": 30.0605, "description": "Brief description" }
      ]
      \`\`\`
      Do not include any other text outside the JSON block.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: userLocation ? {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.lat,
              longitude: userLocation.lng
            }
          }
        } : undefined
      }
    });

    const text = response.text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
    let locations = [];
    if (jsonMatch) {
      try {
        locations = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON", e);
      }
    }

    return {
      text: response.text,
      locations
    };
  } catch (error) {
    console.error('Error searching destination:', error);
    throw error;
  }
}

export async function calculateRouteETA(start: string, end: string) {
  if (!ai) return 'ETA calculation requires Gemini API key';

  try {
    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Calculate the estimated travel time and distance by bus from "${start}" to "${end}" in Kigali, Rwanda. Provide a realistic ETA considering typical traffic.`,
      config: {
        tools: [{ googleMaps: {} }]
      }
    });

    return response.text;
  } catch (error) {
    console.error('Error calculating ETA:', error);
    throw error;
  }
}
