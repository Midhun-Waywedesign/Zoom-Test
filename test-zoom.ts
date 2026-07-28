import fs from "fs";
import path from "path";

// Try .env.local first, then .env
const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const [key, ...value] = line.split("=");
      if (key && value.length > 0) {
        process.env[key.trim()] = value.join("=").trim().replace(/^['"]|['"]$/g, '');
      }
    });
    console.log(`Loaded variables from ${file}`);
    break; // Stop after finding the first valid env file
  }
}

import { getMeetingParticipantsReport } from "./src/lib/zoom-api";

async function run() {
  const meetingId = "88112033347";
  console.log(`Fetching report for meeting ${meetingId}...`);
  try {
    const report = await getMeetingParticipantsReport(meetingId);
    console.log("Report data:");
    console.log(JSON.stringify(report, null, 2));
  } catch (err: any) {
    console.error("Error fetching report:");
    console.error(err.message);
  }
}

run();
