"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";

// Simple column definition interface
export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  emptyMessage?: string;
  itemName?: string;
  enableSearch?: boolean;
  enablePagination?: boolean;
  className?: string;
  tableClassName?: string;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  // Search props
  onSearch?: (searchTerm: string) => void;
  searchValue?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = "Cari data...",
  emptyMessage = "Tidak ada data yang ditemukan.",
  itemName = "item",
  enableSearch = true,
  enablePagination = true,
  className,
  tableClassName,
  // Pagination props
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  // Search props
  onSearch,
  searchValue = "",
}: DataTableProps<T>) {
  const [internalSearchValue, setInternalSearchValue] = React.useState(searchValue);
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Handle search
  const handleSearch = (value: string) => {
    setInternalSearchValue(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Get cell content
  const getCellContent = (item: T, column: DataTableColumn<T>): React.ReactNode => {
    if (column.cell) {
      return column.cell(item);
    }
    const value = item[column.key as keyof T];
    return value != null ? String(value) : '';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      {enableSearch && (
        <div className="flex items-center py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={internalSearchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="rounded-md border bg-background shadow-sm">
        <Table className={cn("", tableClassName)}>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-muted/50">
              {columns.map((column, index) => (
                <TableHead 
                  key={index}
                  className={cn(
                    "font-semibold text-muted-foreground h-12 px-4",
                    column.headerClassName
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => handleSort(String(column.key))}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.length ? (
              data.map((item, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="hover:bg-muted/50 transition-colors border-b last:border-b-0"
                >
                  {columns.map((column, cellIndex) => (
                    <TableCell 
                      key={cellIndex} 
                      className={cn("py-4 px-4", column.className)}
                    >
                      {getCellContent(item, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-sm">{emptyMessage}</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && totalItems > 0 && onPageChange && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          itemName={itemName}
          showRowsPerPage={!!onItemsPerPageChange}
          showFirstLastButtons={true}
          showPageNumbers={true}
          className="border-t pt-4"
        />
      )}
    </div>
  );
}

// Enhanced table wrapper component for consistent styling
export function TableWrapper({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn("rounded-md border bg-background shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

// Enhanced table header for consistent styling
export function EnhancedTableHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <TableHeader className={cn("bg-muted/50 border-b", className)}>
      {children}
    </TableHeader>
  );
}

// Enhanced table row for consistent styling
export function EnhancedTableRow({ 
  children, 
  className,
  ...props 
}: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow 
      className={cn("hover:bg-muted/50 transition-colors border-b last:border-b-0", className)}
      {...props}
    >
      {children}
    </TableRow>
  );
}

// Enhanced table cell for consistent styling
export function EnhancedTableCell({ 
  children, 
  className,
  ...props 
}: React.ComponentProps<typeof TableCell>) {
  return (
    <TableCell 
      className={cn("py-4 px-4", className)}
      {...props}
    >
      {children}
    </TableCell>
  );
}

// Enhanced table head for consistent styling
export function EnhancedTableHead({ 
  children, 
  className,
  sortable = false,
  onSort,
  ...props 
}: React.ComponentProps<typeof TableHead> & {
  sortable?: boolean;
  onSort?: () => void;
}) {
  return (
    <TableHead 
      className={cn("font-semibold text-muted-foreground h-12 px-4", className)}
      {...props}
    >
      {sortable ? (
        <div className="flex items-center space-x-2">
          <span>{children}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
            onClick={onSort}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        children
      )}
    </TableHead>
  );
}