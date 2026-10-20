type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="toolbar">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onChange("")}
        >
          Clear
        </button>
      )}
    </div>
  );
}
