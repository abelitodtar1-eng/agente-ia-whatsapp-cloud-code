const ENZONA_BASE = "https://api.enzona.net";
const TOKEN_URL = `${ENZONA_BASE}/token`;
const PAYMENT_URL = `${ENZONA_BASE}/payment/v1.0.0/payment`;

interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

export async function getEnzonaToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const cacheKey = consumerKey;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=am_application_scope default",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Enzona token error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

export interface EnzonaPaymentParams {
  consumerKey: string;
  consumerSecret: string;
  merchantUuid: string;
  merchantOpId: string;
  amount: number;
  description: string;
  buyerPhone?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface EnzonaPaymentResult {
  transactionUuid: string;
  linkConfirm: string;
}

export async function createEnzonaPayment(params: EnzonaPaymentParams): Promise<EnzonaPaymentResult> {
  const token = await getEnzonaToken(params.consumerKey, params.consumerSecret);

  const body = {
    merchant_op_id: params.merchantOpId,
    buyer_identity_code: params.buyerPhone ?? "",
    currency: "CUP",
    amount: { total: params.amount, tax: 0, shipping: 0, tip: 0 },
    description: params.description,
    terminal_id: params.merchantUuid,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    items: [{ name: params.description, quantity: 1, price: params.amount, tax: 0 }],
  };

  const res = await fetch(PAYMENT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Enzona payment error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json() as { transaction_uuid: string; links?: { rel: string; href: string }[] };
  const linkConfirm = data.links?.find((l) => l.rel === "approval_url")?.href ?? "";
  return { transactionUuid: data.transaction_uuid, linkConfirm };
}
