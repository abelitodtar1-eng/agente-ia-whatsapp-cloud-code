import type { WASocket, proto } from "@whiskeysockets/baileys";
import {
  getOrCreateConversation,
  insertMessage,
  getRecentHistory,
  getConnectionState,
  enqueueOutbox,
  upsertAppointment,
  cancelAppointment as cancelAppointmentDB,
  getAppointmentsByConversation,
  getSystemPrompt,
  type Conversation,
} from "../db";
import { openrouterClient, DENTAL_TOOLS } from "../openrouter";
import {
  getAvailableSlots,
  createAppointment,
  cancelAppointmentInCalendar,
  getUpcomingAppointments,
} from "../google-calendar";
import type OpenAI from "openai";

function extractText(msg: proto.IWebMessageInfo): string | null {
  return (
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    null
  );
}

async function processWithLLM(
  conversation: Conversation,
  userMessage: string,
  phone: string
): Promise<string> {
  const { text: currentPrompt } = getSystemPrompt();
  const history = getRecentHistory(conversation.id, 20);

  const today = new Date().toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayIso = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const dateContext = `\n\n## CONTEXTO TEMPORAL (IMPORTANTE)\nHoy es ${today} (${todayIso}). Cuando el paciente diga "mañana", "esta semana", "el lunes", calcula la fecha exacta a partir de hoy. NUNCA propongas fechas pasadas. Pasa siempre la fecha en formato YYYY-MM-DD a get_available_slots.\n\n## REGLA CRÍTICA DE HERRAMIENTAS (OBLIGATORIO)\nNUNCA digas "no tengo disponibilidad", "no hay huecos" o algo similar SIN haber llamado primero a get_available_slots. Es un error grave inventar disponibilidad. Si el paciente menciona un servicio Y una fecha (aunque sea aproximada como "mañana", "el lunes"), tu PRIMERA acción debe ser llamar get_available_slots con esa fecha. La duración la sacas de la lista de servicios. Si te falta el servicio o la fecha, pídelos antes; pero NO inventes que no hay huecos.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...history.map((m) => ({
      role: (m.role === "human" ? "assistant" : m.role) as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  let response = await openrouterClient.chat.completions.create({
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    messages: [{ role: "system", content: currentPrompt + dateContext }, ...messages],
    tools: DENTAL_TOOLS,
    tool_choice: "auto",
    max_tokens: 1000,
  });

  let iterations = 0;
  while (response.choices[0].finish_reason === "tool_calls" && iterations < 3) {
    iterations++;
    const toolCalls = response.choices[0].message.tool_calls ?? [];
    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      console.log(`[tool] ${tc.function.name}(${JSON.stringify(args)})`);
      let result: string;

      try {
        switch (tc.function.name) {
          case "get_available_slots": {
            const slots = await getAvailableSlots(
              args.date as string,
              args.duration_minutes as number
            );
            if (slots.length === 0) {
              result = JSON.stringify({
                available: false,
                message: "No hay huecos disponibles ese día.",
              });
            } else {
              result = JSON.stringify({
                available: true,
                date: args.date,
                service: args.service,
                slots: slots.slice(0, 6).map((s) => ({
                  label: s.label,
                  start: s.start,
                  end: s.end,
                })),
              });
            }
            break;
          }

          case "book_appointment": {
            const event = await createAppointment({
              patientName: args.patient_name as string,
              patientPhone: phone,
              service: args.service as string,
              professional: args.professional as string,
              startIso: args.start_iso as string,
              endIso: args.end_iso as string,
              notes: args.notes as string | undefined,
            });
            upsertAppointment({
              conversationId: conversation.id,
              googleEventId: event.eventId,
              phone,
              patientName: args.patient_name as string,
              service: args.service as string,
              professional: args.professional as string,
              startsAt: Math.floor(new Date(args.start_iso as string).getTime() / 1000),
              endsAt: Math.floor(new Date(args.end_iso as string).getTime() / 1000),
              status: "confirmed",
              notes: (args.notes as string) ?? null,
            });
            result = JSON.stringify({
              success: true,
              eventId: event.eventId,
              message: "Cita reservada correctamente.",
            });
            break;
          }

          case "cancel_appointment": {
            await cancelAppointmentInCalendar(args.event_id as string);
            cancelAppointmentDB(args.event_id as string);
            result = JSON.stringify({ success: true, message: "Cita cancelada." });
            break;
          }

          case "get_my_appointments": {
            const events = await getUpcomingAppointments(phone, (args.days_ahead as number) ?? 30);
            result = JSON.stringify({
              appointments: events.map((e) => ({
                eventId: e.eventId,
                summary: e.summary,
                date: new Date(e.start).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }),
                time: new Date(e.start).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })),
            });
            break;
          }

          default:
            result = JSON.stringify({ error: "Herramienta desconocida." });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[bot] Error en tool ${tc.function.name}:`, msg);
        result = JSON.stringify({
          error: "Error al consultar el calendario. Inténtalo de nuevo.",
        });
      }

      toolResults.push({
        tool_call_id: tc.id,
        role: "tool",
        content: result,
      });
    }

    response = await openrouterClient.chat.completions.create({
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: currentPrompt },
        ...messages,
        response.choices[0].message as OpenAI.Chat.ChatCompletionAssistantMessageParam,
        ...toolResults,
      ],
      max_tokens: 1000,
    });
  }

  return response.choices[0].message.content ?? "Lo siento, no pude procesar tu mensaje.";
}

export async function handleIncomingMessage(
  sock: WASocket,
  msg: proto.IWebMessageInfo
): Promise<void> {
  const remoteJid = msg.key.remoteJid ?? "";

  if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@newsletter") || remoteJid.endsWith("@broadcast")) {
    console.log("[handler] skip: grupo/canal");
    return;
  }
  if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) {
    console.log(`[handler] skip: jid=${remoteJid}`);
    return;
  }

  const text = extractText(msg);
  if (!text?.trim()) { console.log("[handler] skip: sin texto"); return; }
  console.log(`[handler] OK from=${remoteJid} fromMe=${msg.key.fromMe} text="${text.slice(0,40)}"`);

  const phone = remoteJid.replace(/@(s\.whatsapp\.net|lid)$/, "");
  const pushName = msg.pushName ?? null;

  const conversation = getOrCreateConversation(phone, pushName);

  if (msg.key.fromMe) {
    // Eco de un mensaje que YA insertamos (assistant via processWithLLM o human via dashboard).
    // Comprobar si está en los últimos mensajes para no duplicar.
    const recent = getRecentHistory(conversation.id, 5);
    const alreadyStored = recent.some((m) => m.content === text && (m.role === "assistant" || m.role === "human"));
    if (alreadyStored) return;
    insertMessage(conversation.id, "human", text);
    return;
  }

  insertMessage(conversation.id, "user", text);

  const { mode } = conversation;
  if (mode !== "AI") return;

  try {
    const reply = await processWithLLM(conversation, text, phone);
    insertMessage(conversation.id, "assistant", reply);
    await sock.sendMessage(remoteJid, { text: reply });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const cause = (err as { cause?: unknown })?.cause;
    const status = (err as { status?: unknown })?.status;
    console.error("[bot] Error procesando mensaje:", errMsg, "status=", status, "cause=", cause);
    if (err instanceof Error && err.stack) console.error(err.stack.split("\n").slice(0,5).join("\n"));
  }
}

export { getAppointmentsByConversation };
