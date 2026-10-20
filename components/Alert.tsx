type AlertProps = {
  message: string;
  type?: "error" | "success";
};

export default function Alert({ message, type = "error" }: AlertProps) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`} role="alert">
      {message}
    </div>
  );
}
