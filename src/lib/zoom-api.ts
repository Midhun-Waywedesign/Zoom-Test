const ZOOM_API_BASE = "https://api.zoom.us/v2";
const ZOOM_OAUTH_TOKEN_URL = "https://zoom.us/oauth/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getS2SAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_S2S_CLIENT_ID;
  const clientSecret = process.env.ZOOM_S2S_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      "Missing ZOOM_ACCOUNT_ID / ZOOM_S2S_CLIENT_ID / ZOOM_S2S_CLIENT_SECRET env vars"
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `${ZOOM_OAUTH_TOKEN_URL}?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get Zoom access token: ${res.status} ${body}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function createInstantMeeting(topic: string, hostUserId: string) {
  const token = await getS2SAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/users/${hostUserId}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 1, // instant meeting
      settings: {
        host_video: true,
        participant_video: true,
        waiting_room: false,
        join_before_host: false,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create meeting: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getHostZak(hostUserId: string) {
  const token = await getS2SAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/users/${hostUserId}/token?type=zak`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get ZAK token: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.token as string;
}

export async function getMeetingParticipantsReport(meetingId: string) {
  const token = await getS2SAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/report/meetings/${meetingId}/participants`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get meeting report: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getMeetingRecordings(meetingId: string) {
  const token = await getS2SAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}/recordings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get meeting recordings: ${res.status} ${body}`);
  }

  return res.json();
}