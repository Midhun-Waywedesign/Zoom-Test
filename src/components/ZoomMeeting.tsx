"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  meetingNumber: string;
  password: string;
  userName: string;
  role: number;
  zak?: string;
  signature?: string;
  sdkKey?: string;
  onLeave: () => void;
};

const SDK_VERSION = "6.1.0";

const SCRIPTS = [
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/react.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/react-dom.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/redux.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/redux-thunk.min.js`,
  `https://source.zoom.us/${SDK_VERSION}/lib/vendor/lodash.min.js`,
  // Client View script — different bundle than the embedded one you had before
  `https://source.zoom.us/zoom-meeting-${SDK_VERSION}.min.js`,
];

const STYLES = [
  `https://source.zoom.us/${SDK_VERSION}/css/bootstrap.css`,
  `https://source.zoom.us/${SDK_VERSION}/css/react-select.css`,
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function loadStyle(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = href;
  document.head.appendChild(link);
}

async function loadZoomClientSdk() {
  STYLES.forEach(loadStyle);
  for (const src of SCRIPTS) {
    await loadScript(src);
  }
}

export default function ZoomMeeting({
  meetingNumber,
  password,
  userName,
  role,
  zak,
  signature: providedSignature,
  sdkKey: providedSdkKey,
  onLeave,
}: Props) {
  const [status, setStatus] = useState("Preparing meeting...");
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);

  const rootCreatedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Client View renders itself into a full-page root div with this
    // exact id — Zoom's own CSS makes it fixed/fullscreen once a
    // meeting starts, so we don't manage its size/position ourselves.
    if (!document.getElementById("zmmtg-root")) {
      const root = document.createElement("div");
      root.id = "zmmtg-root";
      document.body.appendChild(root);
      rootCreatedRef.current = true;
    }

    async function start() {
      try {
        let signature = providedSignature;
        let sdkKey = providedSdkKey;

        if (!signature || !sdkKey) {
          setStatus("Requesting signature...");
          const res = await fetch("/api/signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meetingNumber, role }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Signature request failed");
          signature = data.signature;
          sdkKey = data.sdkKey;
        }

        if (cancelled) return;

        setStatus("Loading Zoom SDK...");
        await loadZoomClientSdk();

        const ZoomMtg = (window as any).ZoomMtg;
        if (cancelled || !ZoomMtg) return;

        ZoomMtg.setZoomJSLib(
          `https://source.zoom.us/${SDK_VERSION}/lib`,
          "/av",
        );
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();
        ZoomMtg.i18n.load("en-US");

        setStatus("Initializing SDK...");

        ZoomMtg.init({
          leaveUrl: window.location.href, // see note below re: SPA leave handling
          patchJsMedia: true,
          disablePreview: false,
          success: () => {
            if (cancelled) return;
            setStatus(role === 1 ? "Starting class..." : "Joining class...");
            setZoomVisible(true); // hand off to Zoom's UI right away — don't wait for join() success
            ZoomMtg.join({
              signature,
              sdkKey,
              meetingNumber,
              passWord: password,
              userName,
              userEmail: "",
              ...(zak ? { zak } : {}),
              success: () => {
                if (cancelled) return;
                setJoined(true);
                setStatus("joined");
                ZoomMtg.inMeetingServiceListener(
                  "onMeetingStatus",
                  (data: any) => {
                    if (data?.meetingStatus === 3) {
                      setJoined(false);
                      onLeave();
                    }
                  },
                );
              },
              error: (err: any) => {
                console.error(err);
                setZoomVisible(false); // fall back to our overlay if join actually fails
                if (!cancelled)
                  setError(err?.reason ?? "Failed to join meeting");
              },
            });
          },
          error: (err: any) => {
            console.error(err);
            if (!cancelled) setError(err?.reason ?? "Failed to initialize SDK");
          },
        });
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err?.message ?? "Something went wrong");
      }
    }

    start();

    return () => {
      cancelled = true;
      try {
        (window as any).ZoomMtg?.leaveMeeting?.({});
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Before joining, show a lightweight status overlay. Once joined,
  // Zoom's own full-page Client View UI (in #zmmtg-root) takes over —
  // we don't render anything on top of it.
  if (joined) return null;
  if (joined || zoomVisible) return null;
  const content = (
    <div className="fixed inset-0 w-screen h-screen bg-black flex flex-col overflow-hidden z-[999]">
      <div className="flex items-center justify-between bg-black px-3 py-2 sm:px-4 shrink-0">
        <span className="text-xs sm:text-sm text-gray-200 truncate">
          {error ? `Error: ${error}` : status}
        </span>
        <button
          onClick={onLeave}
          className="text-xs sm:text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 shrink-0"
        >
          Cancel
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        {error ?? status}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
