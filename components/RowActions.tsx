type RowActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="row-actions">
      {onEdit && (
        <button type="button" className="btn-edit" onClick={onEdit}>
          Edit
        </button>
      )}
      {onDelete && (
        <button type="button" className="btn-delete" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  );
}
