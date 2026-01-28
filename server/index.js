import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: new URL("./.env.server", import.meta.url).pathname });

const {
  VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
  SMTP_REPLY_TO,
  CORS_ORIGIN,
  SERVER_PORT,
} = process.env;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || "http://localhost:5173",
  })
);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT ? Number(SMTP_PORT) : 587,
  secure: SMTP_SECURE === "true",
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

function chunkArray(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

async function getRecipients(targetAudience) {
  const includeAll = targetAudience.includes("all");
  const includeTeachers = includeAll || targetAudience.includes("teachers");
  const includeParents = includeAll || targetAudience.includes("parents");

  const recipients = new Set();

  if (includeTeachers) {
    const { data, error } = await supabase
      .from("teachers")
      .select("email")
      .not("email", "is", null);
    if (error) throw error;
    data?.forEach((row) => row.email && recipients.add(row.email));
  }

  if (includeParents) {
    const { data, error } = await supabase
      .from("parents")
      .select("email")
      .not("email", "is", null);
    if (error) throw error;
    data?.forEach((row) => row.email && recipients.add(row.email));
  }

  return Array.from(recipients);
}

function buildEmail(notice) {
  const subject = `[School Bloom] ${notice.title}`;
  const text = `${notice.title}\n\n${notice.content}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1b1b1b;">
      <h2 style="margin:0 0 12px;">${notice.title}</h2>
      <p style="margin:0 0 12px;white-space:pre-line;">${notice.content}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#666;">School Bloom Notice</p>
    </div>
  `;
  return { subject, text, html };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/notices/:id/email", async (req, res) => {
  try {
    if (!SMTP_HOST || !SMTP_FROM) {
      return res.status(400).json({ error: "SMTP is not configured." });
    }

    const noticeId = req.params.id;
    const { data: notice, error } = await supabase
      .from("notices")
      .select("id, title, content, priority, target_audience, published, published_at")
      .eq("id", noticeId)
      .maybeSingle();

    if (error) throw error;
    if (!notice) return res.status(404).json({ error: "Notice not found." });
    if (!notice.published) {
      return res.status(400).json({ error: "Notice is not published." });
    }

    res.status(202).json({ ok: true, queued: true });

    setImmediate(async () => {
      try {
        const recipients = await getRecipients(notice.target_audience || ["all"]);
        if (recipients.length === 0) return;

        const { subject, text, html } = buildEmail(notice);
        const batches = chunkArray(recipients, 50);
        let sent = 0;

        for (const batch of batches) {
          await transporter.sendMail({
            from: SMTP_FROM,
            to: SMTP_FROM,
            bcc: batch,
            subject,
            text,
            html,
            replyTo: SMTP_REPLY_TO || undefined,
          });
          sent += batch.length;
        }

        console.log(`Notice ${notice.id} emails sent: ${sent}`);
      } catch (sendError) {
        console.error("Failed to send notice emails:", sendError);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send notice emails." });
  }
});

const port = SERVER_PORT ? Number(SERVER_PORT) : 3001;
app.listen(port, () => {
  console.log(`Notice mailer listening on ${port}`);
});
