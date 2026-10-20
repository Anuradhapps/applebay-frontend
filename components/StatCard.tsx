type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

export default function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <h2>{value}</h2>
      {description && <small>{description}</small>}
    </div>
  );
}
