import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f3dfe3",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#263e36",
            border: "4px solid #aa8752",
            borderRadius: "999px",
            boxShadow: "inset 0 0 0 4px #fff8f3",
            color: "#fff8f3",
            display: "flex",
            fontFamily: "Georgia, serif",
            fontSize: 106,
            fontWeight: 400,
            height: 150,
            justifyContent: "center",
            lineHeight: 1,
            paddingBottom: 12,
            width: 150,
          }}
        >
          C
        </div>
      </div>
    ),
    size,
  );
}
