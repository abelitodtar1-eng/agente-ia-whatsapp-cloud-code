import OpenAI from "openai";
import { getSystemPrompt } from "./db";

const ollamaClient = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://172.17.0.1:11434/v1",
  apiKey: "ollama",
  fetch: globalThis.fetch.bind(globalThis),
});

const INVENTARIO_KEYWORDS = [
  "registra", "registro", "entrada", "salida", "ajuste",
  "stock", "inventario", "producto", "productos",
  "kardex", "busca", "buscar", "código", "codigo", "sku",
  "cuanto hay", "cuánto hay", "cuanto queda", "cuánto queda",
  "categoría", "categoria", "almacén", "almacen",
  "nuevo producto", "agregar producto",
];

const CONTABILIDAD_KEYWORDS = [
  "cobro", "cobrar", "pago", "pagar", "factura", "facturas",
  "cuenta", "cuentas", "balance", "saldo", "deuda",
  "crédito", "credito", "débito", "debito",
  "ingreso", "ingresos", "gasto", "gastos", "egreso", "egresos",
  "contabilidad", "contador", "contable", "finanza", "finanzas",
  "cuánto debo", "cuanto debo", "estado de cuenta",
  "debe", "haber", "asiento", "balance general",
  "precio", "costo", "costos", "total a pagar",
];

const ESCALATE_KEYWORDS = [
  "hablar con", "habla con", "quiero una persona", "persona real",
  "agente humano", "agente real", "supervisor", "encargado",
  "queja", "reclamación", "reclamo",
  "harto", "furioso", "molesto", "indignado", "disgustad",
  "no me ayuda", "no funciona", "esto no sirve", "me han engañado",
  "speak to", "talk to human", "real person", "human agent",
];

function keywordEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATE_KEYWORDS.some((kw) => lower.includes(kw));
}

function keywordInventario(message: string): boolean {
  const lower = message.toLowerCase();
  return INVENTARIO_KEYWORDS.some((kw) => lower.includes(kw));
}

function keywordContabilidad(message: string): boolean {
  const lower = message.toLowerCase();
  return CONTABILIDAD_KEYWORDS.some((kw) => lower.includes(kw));
}

const VENDEDORA_KEYWORDS = [
  "venta", "ventas", "vender", "vendedor", "vendedora",
  "cliente nuevo", "nuevo cliente", "cotización", "cotizacion",
  "presupuesto", "oferta", "promoción", "promocion", "descuento",
  "pedido nuevo", "quiero comprar", "cuánto cuesta", "cuanto cuesta",
  "precio de", "me interesa", "disponible", "catálogo", "catalogo",
];

function keywordVendedora(message: string): boolean {
  const lower = message.toLowerCase();
  return VENDEDORA_KEYWORDS.some((kw) => lower.includes(kw));
}

export type TriageDecision = "inventario" | "contabilidad" | "vendedora" | "escalate";

export async function triageMessage(message: string): Promise<TriageDecision> {
  if (keywordEscalate(message)) {
    console.log("[triage] keyword match → escalate");
    return "escalate";
  }

  if (keywordInventario(message)) {
    console.log("[triage] keyword match → inventario");
    return "inventario";
  }

  if (keywordContabilidad(message)) {
    console.log("[triage] keyword match → contabilidad");
    return "contabilidad";
  }

  if (keywordVendedora(message)) {
    console.log("[triage] keyword match → vendedora");
    return "vendedora";
  }

  if (!process.env.OLLAMA_BASE_URL) return "inventario";

  const { text: systemPrompt } = getSystemPrompt();
  if (!systemPrompt?.trim()) return "inventario";

  try {
    const response = await ollamaClient.chat.completions.create({
      model: process.env.TRIAGE_MODEL ?? "qwen2.5:7b",
      messages: [
        {
          role: "system",
          content: systemPrompt + '\n\nIMPORTANT: Reply with ONLY valid JSON, nothing else. No explanation. No markdown. Valid actions: "inventario", "contabilidad", "vendedora", "escalate". Example: {"action":"inventario"}',
        },
        { role: "user", content: message },
      ],
      max_tokens: 20,
    });

    const raw = (response.choices[0].message.content ?? "").trim();
    try {
      const data = JSON.parse(raw) as { action?: string };
      if (data.action === "escalate") return "escalate";
      if (data.action === "contabilidad") return "contabilidad";
      if (data.action === "vendedora") return "vendedora";
      return "inventario";
    } catch {
      return "inventario";
    }
  } catch (err) {
    console.error("[triage] llm error, defaulting to inventario:", err instanceof Error ? err.message : err);
    return "inventario";
  }
}
