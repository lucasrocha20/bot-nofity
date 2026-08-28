import fs from "node:fs";
import { google } from "googleapis";
import { env } from "../config/env";

function loadCredentials(): Record<string, unknown> {
  const raw = env.googleServiceAccountJson;
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(fs.readFileSync(raw, "utf8"));
  }
}

const auth = new google.auth.GoogleAuth({
  credentials: loadCredentials(),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export async function shareFolderWithEmail(email: string): Promise<void> {
  await drive.permissions.create({
    fileId: env.driveFolderId,
    sendNotificationEmail: false,
    requestBody: {
      type: "user",
      role: "reader",
      emailAddress: email,
    },
  });
}
