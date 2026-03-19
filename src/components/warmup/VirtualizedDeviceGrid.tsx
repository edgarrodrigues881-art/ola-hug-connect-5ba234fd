import { memo, useCallback, useMemo, useRef, useEffect, useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";
// @ts-ignore - react-window types may not export FixedSizeGrid directly

interface VirtualizedDeviceGridProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  cardHeight?: number;
  gap?: number;
}

const BREAKPOINTS = [
  { min: 1536, cols: 5 },  // 2xl
  { min: 1280, cols: 4 },  // xl
  { min: 1024, cols: 3 },  // lg
  { min: 640, cols: 2 },   // sm
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

const VirtualizedDeviceGrid = memo(({ items, renderItem, cardHeight = CARD_HEIGHT, gap = GAP }: VirtualizedDeviceGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 800 });

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

  const Cell = useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) return null;

    const adjustedStyle: React.CSSProperties = {
      ...style,
      left: Number(style.left) + columnIndex * gap,
      top: Number(style.top) + rowIndex * gap,
      width: columnWidth,
      height: cardHeight,
      paddingRight: 0,
    };

    return (
      <div style={adjustedStyle}>
        {renderItem(items[index], index)}
      </div>
    );
  }, [items, columnCount, columnWidth, cardHeight, gap, renderItem]);

  // For small lists (< 100), render normally without virtualization
  if (items.length < 100) {
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

  const totalHeight = rowCount * (cardHeight + gap);
  const gridHeight = Math.min(dimensions.height, totalHeight);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {dimensions.width > 0 && (
        <Grid
          columnCount={columnCount}
          columnWidth={columnWidth + gap}
          height={gridHeight}
          rowCount={rowCount}
          rowHeight={cardHeight + gap}
          width={dimensions.width + gap}
          overscanRowCount={3}
          style={{ overflowX: "hidden" }}
        >
          {Cell}
        </Grid>
      )}
    </div>
  );
});

VirtualizedDeviceGrid.displayName = "VirtualizedDeviceGrid";

export default VirtualizedDeviceGrid;
