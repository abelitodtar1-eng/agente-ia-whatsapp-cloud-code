import { NextResponse } from "next/server";

export const revalidate = 1800;

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `https://tasas.eltoque.com/v1/trmi?date_to=${today}%2000%3A00%3A01`,
    {
      headers: { Authorization: `Bearer ${process.env.ELTOQUE_TOKEN ?? ""}` },
      next: { revalidate: 1800 },
    }
  );
  if (!res.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  const data = await res.json() as { tasas?: { USD?: number; MLC?: number } };
  return NextResponse.json({
    USD: data.tasas?.USD ?? null,
    MLC: data.tasas?.MLC ?? null,
    updatedAt: new Date().toISOString(),
  });
}
