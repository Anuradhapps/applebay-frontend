
type AlertProps = {
  message: string | { message: string };
  type?: "error" | "success";
};

export default function Alert({
  message,
  type = "error",
}: AlertProps) {
  if (!message) return null;

  let displayMessage: string;

  if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message);

      displayMessage =
        typeof parsed === "object" && parsed !== null
          ? parsed.message ?? message
          : message;
    } catch {
      displayMessage = message;
    }
  } else {
    displayMessage = message.message;
  }

  return (
    <div className={`alert alert-${type}`} role="alert">
      {displayMessage}
    </div>
  );
}
