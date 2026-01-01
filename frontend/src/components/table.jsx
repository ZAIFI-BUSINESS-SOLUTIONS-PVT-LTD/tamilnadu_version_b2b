import React from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

/**
 * Generic reusable Table component
 * @param {Array} columns - [{ field, label, sortable }]
 * @param {Array} data - Array of row objects
 * @param {string} sortField - Current sort field
 * @param {string} sortDirection - 'asc' | 'desc'
 * @param {function} onSort - (field) => void
 * @param {function} renderRow - (row, index) => ReactNode
 * @param {ReactNode} emptyState - What to render if data is empty
 */
const Table = ({
  columns = [],
  data = [],
  sortField,
  sortDirection,
  onSort,
  renderRow,
  emptyState = null,
}) => {
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <CaretDown size={14} className="text-muted-foreground" />;
    return sortDirection === 'asc'
      ? <CaretUp size={14} className="text-primary" />
      : <CaretDown size={14} className="text-primary" />;
  };

  if (!data.length && emptyState) {
    return emptyState;
  }

  return (
    <div className="bg-card border border-border overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-card">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  scope="col"
                  className={`px-6 py-3 text-xs font-semibold text-muted-foreground tracking-wider ${column.sortable !== false ? 'cursor-pointer hover:bg-muted transition-colors' : ''}`}
                  onClick={column.sortable !== false && onSort ? () => onSort(column.field) : undefined}
                >
                  <div className={`flex items-center gap-1 ${column.headerClass ? column.headerClass : 'text-left'}`}>
                    {column.label}
                    {column.sortable !== false && onSort && <SortIcon field={column.field} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {data.map((row, idx) => renderRow(row, idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
