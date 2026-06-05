import { ImageResponse } from "next/og";

export const alt = "Muabox — Where makeup artists meet skincare brands";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a1f44",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 40,
            fontWeight: 800,
            color: "#ffc700",
            letterSpacing: "-0.01em",
          }}
        >
          Muabox
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Where makeup artists meet skincare brands
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#aab4c8", maxWidth: 850 }}>
          Connect Instagram, set your terms, and run paid PR collaborations.
        </div>
      </div>
    ),
    { ...size }
  );
}
