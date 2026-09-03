"use client";

import { useRef } from "react";

type CameraCaptureProps = {
  onCapture: (file: File) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
};

export function CameraCapture({ onCapture, className = "", label = "Take a photo", disabled = false }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openStillCamera() {
    if (disabled) return;
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  return (
    <>
      <button type="button" onClick={openStillCamera} disabled={disabled} className={className}>{label}</button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file?.type.startsWith("image/")) onCapture(file);
        }}
      />
    </>
  );
}
