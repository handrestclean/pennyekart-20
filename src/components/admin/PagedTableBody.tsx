import { Children, ReactNode, useEffect, useState } from "react";
import { TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Drop-in TableBody replacement that paginates its rows and shows page controls in a footer. */
export function PagedTableBody({ children, pageSize = 10 }: { children?: ReactNode; pageSize?: number }) {
  const rows = Children.toArray(children);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = useState(1);
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  const start = (page - 1) * pageSize;
  return (
    <>
      <TableBody>{rows.slice(start, start + pageSize)}</TableBody>
      {total > pageSize && (
        <tfoot>
          <tr>
            <td colSpan={100} className="p-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <span className="px-2">Page {page} / {pages}</span>
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      )}
    </>
  );
}
