"use client";

import { useState, type ReactNode } from "react";

export type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  title: string;
  rows: T[];
  columns: Column<T>[];
  loading: boolean;
  emptyText: string;
  pageSize?: number; // rows per page, default 10
};

export default function DataTable<T extends { id: number }>({
  title,
  rows,
  columns,
  loading,
  emptyText,
  pageSize = 10,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // If a search/filter leaves fewer pages than we're on, fall back to the last one.
  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div className="table-section">
      <div className="table-heading">
        <h3>{title}</h3>
        <span className="muted-text">{rows.length} record(s)</span>
      </div>

      {loading ? (
        <p className="muted-text">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="muted-text">{emptyText}</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.header}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.header}>{c.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="muted-text">
                Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of{" "}
                {rows.length}
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>

                <span className="muted-text">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}