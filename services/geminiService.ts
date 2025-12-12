import { GoogleGenAI, Chat } from "@google/genai";
import { KNOWLEDGE_BASE } from "../constants";
import { PromptContext } from "../types";

/**
 * Constructs the prompt dynamically based on user input and task type.
 * Acts as the "Prompt Generator Agent".
 */
const constructPrompt = (context: PromptContext): string => {
  const { mode, inputData } = context;

  if (mode === 'enhance') {
    return `
## TARGET PROMPT: PLAN ENHANCER (for PE Model) ##
## SYSTEM INSTRUCTION: METAPLANNER ##
You are the Planning Engine (PE). Your goal is to review and optimize the user's existing plan based on core metacognitive techniques and topic-specific learning requirements.
1. **ROLE:** Act as a critical Metacognitive Planning Analyst.
2. **KNOWLEDGE GROUNDING:** **Strictly prioritize** principles found in the provided KNOWLEDGE BASE (below) for all planning methodology. Use **Google Search** only for external context (e.g., standard planning formats, subject difficulty).
3. **TOPIC SENSITIVITY:** You must analyze the nature of each subject (e.g., Is it factual? Procedural? Conceptual?) and prescribe the specific learning technique best suited for it (e.g., *Retrieval Practice* for facts, *Interleaved Practice* for problem-solving).
4. **INTERACTIVITY:** You must ask *one* clarifying question if the plan lacks a clear subject, duration, or core commitment before providing the final plan.

## KNOWLEDGE BASE (File Search Simulation) ##
${KNOWLEDGE_BASE}

## CONTEXT ##
The user's plan is provided below. Analyze it by comparing its structure against the efficient study techniques retrieved from the Knowledge Base.

## TASK ##
1.  **ASSESS:** Identify all study blocks in the plan that are too long (violate Pomodoro) or lack specific retrieval/review time (violate Spaced Repetition).
2.  **ANALYZE SUBJECTS:** For every subject mentioned, determine its cognitive demand. Does it require rote memorization, deep conceptual understanding, or skill acquisition?
3.  **ENHANCE:** Rewrite the schedule. Explicitly integrate and name the *new* metacognitive techniques applied. **Crucially**, customize the technique to the topic (e.g., use "Active Recall via Flashcards" for Vocabulary, "Interleaved Problem Solving" for Math).
4.  **OUTPUT FORMAT:** Output the final revised schedule in a clean, standard **Markdown table** format that matches the user's original plan type (Day, Week, or Month).

## INPUT DATA ##
Plan Content:
${inputData}

Plan Type Detected: [Model to Detect]

## EXPECTED OUTPUT FORMAT ##
[Model to Determine based on input]
    `;
  } else {
    return `
## TARGET PROMPT: NEW LEARNING PLANNER (for PE Model) ##
## SYSTEM INSTRUCTION: METAPLANNER ##
You are the Planning Engine (PE). Your goal is to create a study plan from scratch based on user requirements, expert techniques, and subject-specific nuances.
1. **ROLE:** Act as a creative Metacognitive Planner and Scheduler.
2. **KNOWLEDGE GROUNDING:** **Strictly prioritize** principles found in the provided KNOWLEDGE BASE (below). Use **Google Search** to understand the nature of the subjects and level of expertise required (e.g., "beginner physics curriculum").
3. **TOPIC SENSITIVITY:** You must customize the learning strategy based on the specific type of material (e.g., *Elaboration* for History/Literature, *Generative Learning* for Sciences, *Spaced Practice* for Languages).
4. **INTERACTIVITY:** If the user has NOT provided an explicit **Time Span** (e.g., "weekly," "monthly"), your **first and only** response must be a single, friendly question asking them to specify the Time Span. Do not proceed until answered.

## KNOWLEDGE BASE (File Search Simulation) ##
${KNOWLEDGE_BASE}

## CONTEXT ##
The user's goal is provided below. Synthesize a complete plan based on the techniques retrieved from the Knowledge Base.

## TASK ##
1.  **DETERMINE:** Analyze the user's goal. Identify the **Subject Nature** (Procedural vs Declarative) and **Cognitive Load**.
2.  **STRATEGIZE:** Select the specific metacognitive tools from the Knowledge Base that best fit the *nature* of the identified topics.
3.  **CREATE:** Construct a complete schedule by integrating Fixed Scheduling, Pomodoro timing, and dedicated slots for Spaced Repetition/Retrieval Practice/Habit Formation. Ensure the *activity* within the slot matches the topic (e.g., "Write a summary" for Reading vs "Solve mixed problem set" for Algebra).
4.  **OUTPUT FORMAT:** Output the final plan in a clean, standard **Markdown table** format based on the required Time Span (Day, Week, or Month).

## INPUT DATA ##
User Requirements:
${inputData}

## EXPECTED OUTPUT FORMAT ##
[Model to Determine based on user input]
    `;
  }
};

export interface ChatSessionResult {
  chat: Chat;
  text: string;
}

export const startPlanningSession = async (context: PromptContext): Promise<ChatSessionResult> => {
  try {
    const prompt = constructPrompt(context);

    // Initialize Gemini Client locally to ensure fresh context for every session
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Create a chat session
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        thinkingConfig: { thinkingBudget: 12000 },
        tools: [{ googleSearch: {} }],
      },
    });

    // Send the initial constructed prompt as the first message
    const response = await chat.sendMessage({ message: prompt });
    
    let text = response.text || "I couldn't generate a plan. Please try again with more details.";
    text = appendGroundingSources(text, response);

    return { chat, text };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with the Metacognitive Planner.");
  }
};

export const continuePlanningSession = async (chat: Chat, userMessage: string): Promise<string> => {
  try {
    // We implicitly treat this as a refinement request within the existing session.
    // The 'chat' object holds the history.
    const response = await chat.sendMessage({ message: userMessage });
    let text = response.text || "I couldn't generate a response.";
    text = appendGroundingSources(text, response);
    return text;
  } catch (error) {
     console.error("Gemini API Error during chat:", error);
     throw new Error("Failed to continue the planning session.");
  }
}

// Helper to append sources if available
const appendGroundingSources = (text: string, response: any): string => {
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    const sources = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
            return `- [${chunk.web.title}](${chunk.web.uri})`;
        }
        return null;
      })
      .filter((s: any) => s)
      .join('\n');
    
    if (sources) {
      return text + `\n\n### Sources\n${sources}`;
    }
  }
  return text;
};