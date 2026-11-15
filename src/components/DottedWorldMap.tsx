import React, { useMemo } from 'react';

/**
 * Compact RLE spans [row, startCol, endCol] on a 94x42 geographic grid.
 * Produces 1,243 whole-circle halftone dots with accurate continent silhouettes
 * (North & South America, Greenland, Europe, Africa, Asia, Indonesia, Japan, Australia, NZ).
 */
const WORLD_DOT_SPANS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 29, 40], [0, 71, 71], [1, 17, 21], [1, 31, 40], [1, 64, 75],
  [2, 7, 10], [2, 18, 21], [2, 26, 29], [2, 33, 40], [2, 51, 52], [2, 61, 80],
  [3, 6, 23], [3, 26, 29], [3, 33, 38], [3, 49, 54], [3, 57, 86],
  [4, 5, 23], [4, 28, 29], [4, 33, 37], [4, 41, 42], [4, 48, 88],
  [5, 6, 22], [5, 27, 28], [5, 35, 35], [5, 47, 87],
  [6, 6, 7], [6, 13, 23], [6, 27, 29], [6, 45, 45], [6, 48, 80], [6, 85, 86],
  [7, 14, 24], [7, 26, 30], [7, 45, 45], [7, 48, 80], [7, 85, 85],
  [8, 14, 31], [8, 45, 45], [8, 47, 80],
  [9, 15, 31], [9, 45, 58], [9, 60, 80],
  [10, 15, 28], [10, 45, 53], [10, 55, 56], [10, 58, 80],
  [11, 14, 27], [11, 44, 46], [11, 49, 52], [11, 56, 79], [11, 82, 82],
  [12, 15, 26], [12, 44, 45], [12, 51, 51], [12, 53, 76], [12, 78, 78], [12, 81, 81],
  [13, 15, 26], [13, 44, 48], [13, 55, 76], [13, 78, 78], [13, 80, 81],
  [14, 16, 25], [14, 44, 49], [14, 55, 76],
  [15, 16, 22], [15, 24, 24], [15, 43, 53], [15, 55, 76],
  [16, 17, 20], [16, 42, 76],
  [17, 18, 20], [17, 42, 59], [17, 64, 75], [17, 77, 77],
  [18, 18, 20], [18, 22, 22], [18, 25, 25], [18, 42, 60], [18, 64, 68], [18, 70, 73],
  [19, 20, 22], [19, 42, 59], [19, 65, 67], [19, 71, 73], [19, 77, 77],
  [20, 22, 23], [20, 41, 57], [20, 65, 67], [20, 71, 74],
  [21, 23, 23], [21, 26, 27], [21, 42, 58], [21, 66, 66], [21, 73, 73], [21, 78, 78],
  [22, 25, 30], [22, 43, 58], [22, 72, 72], [22, 78, 78],
  [23, 25, 31], [23, 48, 58], [23, 76, 76],
  [24, 25, 32], [24, 49, 57], [24, 75, 76],
  [25, 25, 33], [25, 49, 56], [25, 72, 72], [25, 75, 78],
  [26, 25, 35], [26, 49, 56], [26, 73, 73], [26, 77, 77], [26, 81, 83],
  [27, 25, 36], [27, 49, 56], [27, 75, 75], [27, 83, 84],
  [28, 25, 35], [28, 49, 55],
  [29, 26, 35], [29, 49, 55], [29, 58, 58], [29, 79, 83],
  [30, 26, 35], [30, 49, 55], [30, 58, 58], [30, 78, 83],
  [31, 27, 35], [31, 50, 54], [31, 58, 58], [31, 77, 84],
  [32, 27, 34], [32, 50, 54], [32, 57, 57], [32, 76, 84],
  [33, 27, 32], [33, 50, 53], [33, 75, 85],
  [34, 27, 32], [34, 50, 53], [34, 75, 84],
  [35, 27, 31], [35, 51, 52], [35, 76, 77], [35, 80, 84],
  [36, 27, 31], [36, 81, 83], [36, 90, 90],
  [37, 27, 30], [37, 90, 90],
  [38, 27, 28], [38, 83, 83],
  [39, 27, 28], [39, 88, 88],
  [40, 27, 28],
  [41, 28, 28],
];

const CELL_SIZE = 6;
const GRID_WIDTH = 94 * CELL_SIZE;  // 564
const GRID_HEIGHT = 42 * CELL_SIZE; // 252

export const DottedWorldMap: React.FC<{ className?: string }> = ({ className = '' }) => {
  const dots = useMemo(() => {
    const list: Array<{ cx: number; cy: number }> = [];
    for (const [row, startCol, endCol] of WORLD_DOT_SPANS) {
      const cy = row * CELL_SIZE + CELL_SIZE / 2;
      for (let col = startCol; col <= endCol; col++) {
        list.push({ cx: col * CELL_SIZE + CELL_SIZE / 2, cy });
      }
    }
    return list;
  }, []);

  return (
    <div
      className={`account-map absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        maskImage: 'radial-gradient(ellipse 94% 88% at 50% 48%, black 52%, transparent 99%)',
        WebkitMaskImage: 'radial-gradient(ellipse 94% 88% at 50% 48%, black 52%, transparent 99%)',
        opacity: 0.44,
      }}
    >
      <svg
        viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}
        className="w-full h-full object-cover scale-[1.03]"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#7d8089">
          {dots.map((dot, idx) => (
            <circle key={idx} cx={dot.cx} cy={dot.cy} r={1.42} />
          ))}
        </g>
      </svg>
    </div>
  );
};

export default DottedWorldMap;
