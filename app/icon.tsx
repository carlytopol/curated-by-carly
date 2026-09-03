import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            border: "12px solid #aa8752",
            borderRadius: "999px",
            boxShadow: "inset 0 0 0 10px #fff8f3",
            color: "#fff8f3",
            display: "flex",
            fontFamily: "Georgia, serif",
            fontSize: 300,
            fontWeight: 400,
            height: 426,
            justifyContent: "center",
            lineHeight: 1,
            paddingBottom: 34,
            width: 426,
          }}
        >
          C
        </div>
      </div>
    ),
    size,
  );
}
