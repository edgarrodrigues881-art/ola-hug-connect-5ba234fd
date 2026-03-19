import { memo, useMemo, useRef, useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";

interface VirtualizedDeviceGridProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  cardHeight?: number;
  gap?: number;
}

const BREAKPOINTS = [
  { min: 1536, cols: 5 },
  { min: 1280, cols: 4 },
  { min: 1024, cols: 3 },
  { min: 640, cols: 2 },
  { min: 0, cols: 1 },
];

function getColumns(width: number) {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.min) return bp.cols;
  }
  return 1;
}

const CARD_HEIGHT = 210;
const GAP = 16;
const MOBILE_BREAKPOINT = 768;

const VirtualizedDeviceGrid = memo(({ items, renderItem, cardHeight = CARD_HEIGHT, gap = GAP }: VirtualizedDeviceGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 800 });
  const isMobile = dimensions.width > 0 && dimensions.width < MOBILE_BREAKPOINT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight - rect.top - 20;
      setDimensions({ width: rect.width, height: Math.max(400, viewportH) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columnCount = useMemo(() => getColumns(dimensions.width), [dimensions.width]);
  const rowCount = useMemo(() => Math.ceil(items.length / columnCount), [items.length, columnCount]);
  const columnWidth = useMemo(() => {
    if (columnCount <= 1) return dimensions.width;
    return (dimensions.width - gap * (columnCount - 1)) / columnCount;
  }, [dimensions.width, columnCount, gap]);

  // Small lists: no virtualization needed
  if (items.length < 50) {
    return (
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {items.map((item, i) => (
          <div key={item.id || i}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    );
  }

  // Mobile: single-column list with native touch scrolling
  if (isMobile) {
    const totalHeight = items.length * (cardHeight + gap);
    const listHeight = Math.min(dimensions.height, totalHeight);

    return (
      <div ref={containerRef} style={{ width: "100%", WebkitOverflowScrolling: "touch" }}>
        {dimensions.width > 0 && (
          <List
            height={listHeight}
            itemCount={items.length}
            itemSize={cardHeight + gap}
            width={dimensions.width}
            overscanCount={5}
            style={{ overflowX: "hidden" }}
          >
            {({ index, style }) => (
              <div style={{ ...style, height: cardHeight, paddingBottom: gap }}>
                {renderItem(items[index], index)}
              </div>
            )}
          </List>
        )}
      </div>
    );
  }

  // Desktop: multi-column rows via FixedSizeList
  const totalHeight = rowCount * (cardHeight + gap);
  const gridHeight = Math.min(dimensions.height, totalHeight);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {dimensions.width > 0 && (
        <List
          height={gridHeight}
          itemCount={rowCount}
          itemSize={cardHeight + gap}
          width={dimensions.width}
          overscanCount={3}
        >
          {({ index: rowIndex, style }) => {
            const startIdx = rowIndex * columnCount;
            const rowItems = items.slice(startIdx, startIdx + columnCount);
            return (
              <div style={{ ...style, display: "flex", gap }} key={rowIndex}>
                {rowItems.map((item, colIdx) => (
                  <div key={item.id || startIdx + colIdx} style={{ width: columnWidth, height: cardHeight, flexShrink: 0 }}>
                    {renderItem(item, startIdx + colIdx)}
                  </div>
                ))}
              </div>
            );
          }}
        </List>
      )}
    </div>
  );
});

VirtualizedDeviceGrid.displayName = "VirtualizedDeviceGrid";

export default VirtualizedDeviceGrid;
