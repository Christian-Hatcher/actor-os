import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight } from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Use the bundled PDF.js worker via CDN so no extra build config is needed.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  url: string
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [containerWidth, setContainerWidth] = useState<number>(480)

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const ro = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width
        if (width) setContainerWidth(Math.floor(width))
      })
      ro.observe(node)
    }
  }, [])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  function prevPage() {
    setPageNumber((p) => Math.max(1, p - 1))
  }

  function nextPage() {
    setPageNumber((p) => Math.min(numPages ?? 1, p + 1))
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex h-[500px] items-center justify-center rounded-[14px] border border-rule bg-bg2">
            <p className="font-serif text-[15px] italic text-paper-faint">Loading PDF&hellip;</p>
          </div>
        }
        error={
          <div className="flex h-[300px] items-center justify-center rounded-[14px] border border-rule bg-bg2">
            <p className="font-serif text-[15px] italic text-paper-faint">
              Could not load PDF.
            </p>
          </div>
        }
        className="w-full"
      >
        <Page
          pageNumber={pageNumber}
          width={containerWidth}
          renderAnnotationLayer
          renderTextLayer
          className="overflow-hidden rounded-[14px] border border-rule shadow-lg"
        />
      </Document>

      {numPages != null && numPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prevPage}
            disabled={pageNumber <= 1}
            className="grid size-[44px] place-items-center rounded-full border border-rule-strong bg-white/[0.03] text-paper-dim hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper-faint">
            {pageNumber} / {numPages}
          </span>
          <button
            type="button"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="grid size-[44px] place-items-center rounded-full border border-rule-strong bg-white/[0.03] text-paper-dim hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
