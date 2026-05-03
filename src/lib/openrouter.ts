import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;
console.log(`[openrouter] init keyPresent=${!!apiKey} keyPrefix=${apiKey?.slice(0, 12) ?? "NONE"}`);

export const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey,
  timeout: 60_000,
  maxRetries: 2,
  fetch: globalThis.fetch.bind(globalThis),
  defaultHeaders: {
    "HTTP-Referer": "https://agente-ia-whatsapp",
    "X-Title": "IA Founders - Dental Agent",
  },
});

export const DENTAL_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_available_slots",
      description:
        "Consulta los horarios disponibles en el calendario de la clínica para una fecha y servicio concretos. Úsala cuando el paciente pregunte cuándo puede venir o pida cita.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description:
              "Fecha en formato YYYY-MM-DD. Si el paciente dice 'mañana', calcula la fecha exacta.",
          },
          service: {
            type: "string",
            description: "Nombre del servicio solicitado (ej: 'Limpieza dental', 'Revisión').",
          },
          duration_minutes: {
            type: "number",
            description:
              "Duración estimada del servicio en minutos (usa la tabla de servicios de la clínica).",
          },
        },
        required: ["date", "service", "duration_minutes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Reserva una cita en el calendario. Llámala solo cuando el paciente haya confirmado explícitamente el slot.",
      parameters: {
        type: "object",
        properties: {
          patient_name: {
            type: "string",
            description: "Nombre completo del paciente.",
          },
          service: {
            type: "string",
            description: "Servicio a realizar.",
          },
          professional: {
            type: "string",
            description:
              "Nombre del profesional. Si el paciente no especificó, asigna el más adecuado según la tabla de profesionales.",
          },
          start_iso: {
            type: "string",
            description: "Fecha y hora de inicio en ISO 8601 (ej: 2025-07-14T10:00:00+02:00).",
          },
          end_iso: {
            type: "string",
            description: "Fecha y hora de fin en ISO 8601.",
          },
          notes: {
            type: "string",
            description: "Notas adicionales del paciente (opcional).",
          },
        },
        required: ["patient_name", "service", "professional", "start_iso", "end_iso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description:
        "Cancela una cita existente. Pregunta siempre confirmación antes de llamar esta función.",
      parameters: {
        type: "object",
        properties: {
          event_id: {
            type: "string",
            description: "ID del evento de Google Calendar a cancelar.",
          },
          reason: {
            type: "string",
            description: "Motivo de la cancelación (opcional).",
          },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_appointments",
      description:
        "Consulta las próximas citas del paciente. Úsala cuando el paciente pregunte '¿cuándo tengo mi cita?' o 'quiero ver mis citas'.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: {
            type: "number",
            description: "Cuántos días hacia adelante buscar. Default 30.",
          },
        },
        required: [],
      },
    },
  },
];

export async function generateReply(
  systemPrompt: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const response = await openrouterClient.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: 500,
  });
  return response.choices[0].message.content ?? "";
}
