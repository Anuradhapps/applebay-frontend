type FormFieldProps = {
  id: string;
  label: string;
  full?: boolean;
  children: React.ReactNode;
};

export default function FormField({ id, label, full, children }: FormFieldProps) {
  return (
    <div className={full ? "form-field full-width" : "form-field"}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
