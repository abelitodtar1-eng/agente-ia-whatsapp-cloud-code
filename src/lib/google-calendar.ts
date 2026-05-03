import { google } from "googleapis";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import path from "node:path";

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

export interface CalendarEvent {
  eventId: string;
  summary: string;
  start: string;
  end: string;
}

export interface CreateAppointmentParams {
  patientName: string;
  patientPhone: string;
  service: string;
  professional: string;
  startIso: string;
  endIso: string;
  notes?: string;
}

export interface CreatedEvent {
  eventId: string;
  htmlLink: string;
}

function getAuth(): GoogleAuth | OAuth2Client {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const keyFile = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
    return new GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  }

  const oauth2 = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2;
}

function madridOffset(date: string): string {
  // DST en España: último domingo de marzo a último domingo de octubre → +02:00, resto +01:00
  const m = parseInt(date.slice(5, 7), 10);
  return m >= 4 && m <= 10 ? "+02:00" : "+01:00";
}

export async function getAvailableSlots(
  date: string,
  durationMinutes: number
): Promise<TimeSlot[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth: auth as any });

  const tz = madridOffset(date);
  const dayStart = new Date(`${date}T09:00:00${tz}`);
  const dow = dayStart.getUTCDay();
  if (dow === 0) {
    console.log(`[calendar] ${date}: domingo, sin disponibilidad`);
    return [];
  }
  const dayEnd =
    dow === 6 ? new Date(`${date}T14:00:00${tz}`) : new Date(`${date}T20:00:00${tz}`);

  console.log(`[calendar] consultando ${date} (${dayStart.toISOString()} → ${dayEnd.toISOString()}) cal=${calendarId}`);

  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      timeZone: "Europe/Madrid",
      items: [{ id: calendarId }],
    },
  });

  const busy = freeBusy.data.calendars?.[calendarId]?.busy ?? [];
  const slots: TimeSlot[] = [];
  const cursor = new Date(dayStart);

  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
    if (slotEnd > dayEnd) break;

    const hasConflict = busy.some((b) => {
      const bs = new Date(b.start!).getTime();
      const be = new Date(b.end!).getTime();
      return cursor.getTime() < be && slotEnd.getTime() > bs;
    });

    if (!hasConflict && cursor.getTime() > Date.now()) {
      slots.push({
        start: cursor.toISOString(),
        end: slotEnd.toISOString(),
        label: cursor.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        }),
      });
    }
    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  console.log(`[calendar] ${date}: ${slots.length} slots libres`);
  return slots;
}

export async function createAppointment(
  params: CreateAppointmentParams
): Promise<CreatedEvent> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() as any });

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    requestBody: {
      summary: `${params.service} — ${params.patientName}`,
      description: [
        `Paciente: ${params.patientName}`,
        `Teléfono: ${params.patientPhone}`,
        `Profesional: ${params.professional}`,
        params.notes ? `Notas: ${params.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: params.startIso, timeZone: "Europe/Madrid" },
      end: { dateTime: params.endIso, timeZone: "Europe/Madrid" },
      colorId: "2",
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 },
          { method: "popup", minutes: 60 },
        ],
      },
    },
  });

  return {
    eventId: event.data.id!,
    htmlLink: event.data.htmlLink!,
  };
}

export async function cancelAppointmentInCalendar(eventId: string): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() as any });
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    eventId,
  });
}

export async function getUpcomingAppointments(
  phone: string,
  days = 30
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: "v3", auth: getAuth() as any });
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    timeMin,
    timeMax,
    q: phone,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? []).map((e) => ({
    eventId: e.id!,
    summary: e.summary ?? "",
    start: e.start?.dateTime ?? "",
    end: e.end?.dateTime ?? "",
  }));
}
