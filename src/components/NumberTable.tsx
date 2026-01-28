import { useState, useEffect, type FC } from "react";

type TableRow = (number | null)[];
type TableMatrix = TableRow[];

const STORAGE_KEY = "numberTableMatrix";

const generateRandomTable = (): TableMatrix => {
  const ROWS = 18;
  const COLS = 9;
  const NUMBERS_PER_ROW = 5;

  // Column distribution: col 0 has 9 numbers, cols 1-7 have 10 each, col 8 has 11
  const columnUsage = [9, 10, 10, 10, 10, 10, 10, 10, 11];

  // Step 1: Pre-assign which columns appear in which rows
  // This ensures each row gets exactly 5 columns and each column is used the right number of times
  const rowColumnAssignments: number[][] = Array.from(
    { length: ROWS },
    () => [],
  );

  for (let col = 0; col < COLS; col++) {
    const usageCount = columnUsage[col];

    // Find rows that can still accept this column (have less than 5 columns assigned)
    const availableRows: number[] = [];
    for (let row = 0; row < ROWS; row++) {
      if (rowColumnAssignments[row].length < NUMBERS_PER_ROW) {
        availableRows.push(row);
      }
    }

    // Shuffle available rows
    for (let i = availableRows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableRows[i], availableRows[j]] = [
        availableRows[j],
        availableRows[i],
      ];
    }

    // Assign this column to `usageCount` rows
    for (let i = 0; i < usageCount; i++) {
      if (i < availableRows.length) {
        rowColumnAssignments[availableRows[i]].push(col);
      }
    }
  }

  // Step 2: Create number pools for each column with correct ranges
  const columnPools: number[][] = [];

  for (let col = 0; col < COLS; col++) {
    const numbers: number[] = [];
    let start: number, end: number;

    if (col === 0) {
      start = 1;
      end = 9;
    } else if (col === 8) {
      start = 80;
      end = 90;
    } else {
      start = col * 10;
      end = col * 10 + 9;
    }

    for (let num = start; num <= end; num++) {
      numbers.push(num);
    }

    // Shuffle the numbers in this column
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    columnPools.push(numbers);
  }

  // Step 3: Generate the matrix using pre-assigned columns
  const columnIndices = new Array(COLS).fill(0);
  const matrix: TableMatrix = [];

  for (let row = 0; row < ROWS; row++) {
    const tableRow: TableRow = new Array(COLS).fill(null);
    const columnsForThisRow = rowColumnAssignments[row];

    // Sort columns to maintain left-to-right order
    columnsForThisRow.sort((a, b) => a - b);

    // Place numbers in assigned columns
    for (const col of columnsForThisRow) {
      if (columnIndices[col] < columnPools[col].length) {
        tableRow[col] = columnPools[col][columnIndices[col]];
        columnIndices[col]++;
      }
    }

    matrix.push(tableRow);
  }

  return matrix;
};

export const NumberTable: FC<{
  drawnNumbers: number[];
}> = ({ drawnNumbers }) => {
  const [matrix, setMatrix] = useState<TableMatrix>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : generateRandomTable();
  });

  // Save matrix to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  }, [matrix]);

  // Check if any row has all numbers drawn (Bingo!)
  const isBingo = matrix.some((row) => {
    // Get all non-null numbers in this row
    const rowNumbers = row.filter((cell) => cell !== null) as number[];
    // Check if all 5 numbers in this row are in drawnNumbers
    return (
      rowNumbers.length === 5 &&
      rowNumbers.every((num) => drawnNumbers.includes(num))
    );
  });

  const bingoNumbers = matrix
    .find((row) => {
      const rowNumbers = row.filter((cell) => cell !== null) as number[];
      return (
        rowNumbers.length === 5 &&
        rowNumbers.every((num) => drawnNumbers.includes(num))
      );
    })
    ?.filter((cell) => cell !== null) as number[] | undefined;

  const handleRegenerateTable = () => {
    const newMatrix = generateRandomTable();
    setMatrix(newMatrix);
  };

  return (
    <div className="w-full overflow-x-auto">
      {isBingo && (
        <div className="text-center p-4 mb-4 font-bold text-3xl md:text-4xl text-gold bg-linear-to-br from-crimson to-dark-red rounded-lg border-2 border-gold box-shadow-container animate-pulse flex flex-col gap-4 items-center">
          <div>🎉 BINGO! 🎉</div>
          <div className="text-base">Số Bingo: {bingoNumbers?.join(", ")}</div>
        </div>
      )}
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden box-shadow-container">
        <tbody>
          {matrix.map((row, rowIndex) => (
            <>
              <tr key={rowIndex} className="hover:bg-gold/10 transition-colors">
                {row.map((cell, colIndex) => {
                  const isDrawn = cell !== null && drawnNumbers.includes(cell);
                  return (
                    <td
                      key={colIndex}
                      className={`border border-gold p-2 text-center font-semibold text-sm md:text-base transition-all duration-300 ${
                        cell !== null
                          ? isDrawn
                            ? "bg-gold text-dark-red animate-fade-in"
                            : "bg-linear-to-br from-crimson to-dark-red text-gold"
                          : "bg-gray-100"
                      }`}
                    >
                      {cell !== null ? cell : ""}
                    </td>
                  );
                })}
              </tr>
              {(rowIndex + 1) % 3 === 0 && rowIndex !== matrix.length - 1 && (
                <tr>
                  <td colSpan={9} className="h-2 bg-crimson"></td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleRegenerateTable}
          disabled={drawnNumbers.length > 0}
          className={`px-6 py-3 text-base font-bold border-none rounded-full cursor-pointer uppercase tracking-wider transition-all duration-300 ${
            drawnNumbers.length > 0
              ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-50"
              : "bg-linear-to-br from-gold to-orange-600 text-dark-red border-2 border-crimson hover:-translate-y-0.5 hover:box-shadow-button-hover box-shadow-button"
          }`}
        >
            Tạo bảng số mới
        </button>
      </div>
    </div>
  );
};
