import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0f172a 0%, #0f766e 45%, #16a34a 100%)",
          color: "#f8fafc",
          padding: "64px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "32px",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(248, 250, 252, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "24px",
            }}
          >
            NG
          </div>
          Tax Reform Assistant
        </div>

        <div style={{ fontSize: "54px", fontWeight: 700, maxWidth: "760px" }}>
          Clear guidance on Nigerian tax reforms and business compliance.
        </div>

        <div style={{ fontSize: "26px", opacity: 0.9 }}>
          Powered by curated statutes and policy updates.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
