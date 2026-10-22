"use client";

import { useEffect, useRef } from "react";

type AlertProps = {
  message: string | { message: string };
  type?: "error" | "success";
  /** Called when the user dismisses the alert or the auto-hide timer fires. */
  onClose?: () => void;
  /** Auto-dismiss after this many ms. Only applies when onClose is provided. */
  autoHideMs?: number;
};

function toDisplayMessage(message: AlertProps["message"]): string {
  if (!message) return "";
  if (typeof message !== "string") return message.message ?? "";

  try {
    const parsed = JSON.parse(message);
    if (typeof parsed !== "object" || parsed === null) return message;
    if (typeof parsed.message === "string" && parsed.message) return parsed.message;

    // Spring's default error body has no "message"; show friendly text instead of raw JSON.
    if (typeof parsed.status === "number") return statusMessage(parsed.status);
    return message;
  } catch {
    return message;
  }
}

function statusMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request. Please check the entered values.";
    case 404:
      return "The requested record was not found.";
    case 409:
      return "This data conflicts with an existing record.";
    default:
      return status >= 500
        ? "Something went wrong on the server. Please try again."
        : "The request could not be completed.";
  }
}

export default function Alert({
  message,
  type = "error",
  onClose,
  autoHideMs,
}: AlertProps) {
  const displayMessage = toDisplayMessage(message);

  // Keep the latest onClose without restarting the timer on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!displayMessage || !autoHideMs || !onCloseRef.current) return;
    const timer = setTimeout(() => onCloseRef.current?.(), autoHideMs);
    return () => clearTimeout(timer);
  }, [displayMessage, autoHideMs]);

  if (!displayMessage) return null;

  return (
    <div
      className={`alert alert-${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <span className="alert-text">{displayMessage}</span>
      {onClose && (
        <button
          type="button"
          className="alert-close"
          aria-label="Dismiss message"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}