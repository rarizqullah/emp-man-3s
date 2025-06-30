"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  // Pagination state
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  
  // Callbacks
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  
  // Customization
  showRowsPerPage?: boolean;
  showFirstLastButtons?: boolean;
  showPageNumbers?: boolean;
  className?: string;
  
  // Labels
  itemName?: string; // e.g., "karyawan", "data", "items"
  rowsPerPageOptions?: number[];
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showRowsPerPage = true,
  showFirstLastButtons = true,
  showPageNumbers = true,
  className,
  itemName = "item",
  rowsPerPageOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic
      if (currentPage <= 3) {
        // Show first pages
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show last pages
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Show current page with context
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  // Don't render if there's no data
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-2 py-4 ${className}`}>
      {/* Left side - Items info and rows per page */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
        {/* Items info */}
        <div className="text-sm text-muted-foreground">
          {totalItems > 0 ? (
            <>
              Menampilkan {startIndex + 1}-{endIndex} dari {totalItems} {itemName}
            </>
          ) : (
            <>0 {itemName}</>
          )}
        </div>

        {/* Rows per page selector */}
        {showRowsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Baris per halaman:</p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {rowsPerPageOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side - Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          {/* First page button */}
          {showFirstLastButtons && (
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              title="Halaman pertama"
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Previous page button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Halaman sebelumnya"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          {showPageNumbers && totalPages > 1 && (
            <div className="flex items-center space-x-1">
              {pageNumbers.map((page, index) => {
                if (page === "ellipsis") {
                  return (
                    <div key={`ellipsis-${index}`} className="flex h-8 w-8 items-center justify-center">
                      <span className="text-muted-foreground">...</span>
                    </div>
                  );
                }
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => onPageChange(page as number)}
                    title={`Halaman ${page}`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Simple page indicator when page numbers are hidden */}
          {!showPageNumbers && totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages}
              </span>
            </div>
          )}

          {/* Next page button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Halaman selanjutnya"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          {showFirstLastButtons && (
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Halaman terakhir"
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified pagination for smaller tables
export function SimplePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName = "item",
  className,
}: Pick<DataTablePaginationProps, 
  "currentPage" | "totalPages" | "totalItems" | "itemsPerPage" | 
  "onPageChange" | "itemName" | "className">) {
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between px-2 py-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        Menampilkan {startIndex + 1}-{endIndex} dari {totalItems} {itemName}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          
          <span className="text-sm font-medium">
            Halaman {currentPage} dari {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Selanjutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
