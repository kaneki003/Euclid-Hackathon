import React, { useState, useEffect } from "react";

const GRID_SIZE = 5;
const MAX_MINES = Math.floor((GRID_SIZE * GRID_SIZE) / 2); // Max number of mines is half the grid cells

function Home() {
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false); // State for tracking if game is started
  const [score, setScore] = useState(0);
  const [numMines, setNumMines] = useState(1); // State for number of mines (and diamonds)

  const generateGrid = () => {
    const newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill({ type: "empty", revealed: false }));

    let mineCount = 0;
    let diamondCount = 0;

    // Randomly place mines
    while (mineCount < numMines) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);

      if (newGrid[x][y].type === "empty") {
        newGrid[x][y] = { type: "mine", revealed: false };
        mineCount++;
      }
    }

    // Randomly place diamonds (equal to mines)
    while (diamondCount < numMines) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);

      if (newGrid[x][y].type === "empty") {
        newGrid[x][y] = { type: "diamond", revealed: false };
        diamondCount++;
      }
    }

    setGrid(newGrid);
  };

  useEffect(() => {
    if (gameStarted) {
      generateGrid(); // Regenerate grid when game starts
    }
  }, [numMines, gameStarted]);

  const handleClick = (x, y) => {
    if (gameOver || grid[x][y].revealed) return;

    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        rowIndex === x && colIndex === y ? { ...cell, revealed: true } : cell
      )
    );

    setGrid(newGrid);

    if (newGrid[x][y].type === "mine") {
      setGameOver(true);
      setGameStarted(false); // End the game when a mine is revealed
    } else if (newGrid[x][y].type === "diamond") {
      setScore(score + 10);
    }
  };

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setGameStarted(true); // Set game as started when resetting
    generateGrid();
  };

  const cashOut = () => {
    // Handle cash out logic here (like saving the score, ending the game early, etc.)
    setGameStarted(false); // End the game when cashing out
  };

  const increaseMines = () => {
    if (numMines < MAX_MINES) {
      setNumMines((prevMines) => prevMines + 1);
    }
  };

  const decreaseMines = () => {
    if (numMines > 1) {
      setNumMines((prevMines) => prevMines - 1);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex">
      {/* Sidebar */}
      <div className="bg-neutral-800 p-6 shadow-lg w-[40%]">
        <h1 className="text-2xl text-yellow-400 font-bold m-2">ChainGamble</h1>

        {/* Bet Amount */}
        <div className="flex gap-2 flex-wrap mb-6">
          <div>
            <span className="block text-white mb-2">Bet Amount</span>
            <div className="flex items-center space-x-4">
              <button className="bg-gray-700 text-white px-4 py-2 rounded-lg">
                Min
              </button>
              <input
                type="text"
                className="text-center bg-gray-700 text-white w-24 py-2 rounded-lg"
              />
              <button className="bg-gray-700 text-white px-4 py-2 rounded-lg">
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Mines Selector */}
        <div className="mb-6">
          <span className="block text-white mb-2">Mines (Diamonds)</span>
          <div className="flex items-center space-x-4">
            <button
              onClick={decreaseMines}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              -
            </button>
            <input
              type="text"
              value={numMines}
              className="text-center bg-gray-700 text-white w-20 py-2 rounded-lg"
              readOnly
            />
            <button
              onClick={increaseMines}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Score */}
        <div className="mb-6">
          <span className="block text-white">Score</span>
          <div className="flex items-center">
            <span className="text-3xl text-yellow-400 font-bold">{score}</span>
          </div>
        </div>

        {/* Start Game or Cash Out Button */}
        <button
          onClick={gameOver || !gameStarted ? resetGame : cashOut}
          className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 text-lg font-semibold rounded-lg w-full shadow-lg hover:scale-105 transition-transform"
        >
          {gameOver ? "Start Game" : gameStarted ? "Cash Out" : "Start Game"}
        </button>
      </div>

      {/* Game Grid */}
      <div className="w-[60%] flex items-center justify-center">
        <div className="ml-10 w-fit">
          <div className="grid grid-cols-5 h-fit gap-2">
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleClick(rowIndex, colIndex)}
                  className={`w-20 h-20 rounded-md border-2 border-neutral-600 flex justify-center items-center cursor-pointer transform transition-transform duration-500 ${
                    cell.revealed
                      ? cell.type === "mine"
                        ? "bg-red-600 border-red-500"
                        : cell.type === "diamond"
                        ? "bg-green-600 border-green-500"
                        : "bg-gray-600 border-gray-500"
                      : "bg-neutral-800 hover:scale-105"
                  }`}
                >
                  {cell.revealed &&
                    (cell.type === "mine"
                      ? "💣"
                      : cell.type === "diamond"
                      ? "💎"
                      : "")}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
