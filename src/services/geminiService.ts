import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function searchDestination(query: string, userLocation?: { lat: number; lng: number }) {
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
  try {
    const response = await ai.models.generateContent({
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
