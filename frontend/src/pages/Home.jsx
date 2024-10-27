import React, { useState, useEffect } from "react";
import { Placebet } from "../components/functions/functions";
import { Claimfxn } from "../components/functions/functions";

const GRID_SIZE = 5;
const MAX_MINES = 25;

function Home({ Token, Address, network }) {
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [numMines, setNumMines] = useState(1);
  const [betAmount, setBetAmount] = useState(0);

  const generateGrid = () => {
    const newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill({ type: "empty", revealed: false }));
    setGrid(newGrid);
  };

  useEffect(() => {
    if (gameStarted) {
      generateGrid();
    }
  }, [gameStarted]);

  const handleClick = async (x, y) => {
    if (gameOver || grid[x][y].revealed) return;

    // Placeholder for random number generation
    const randomNumber = {}; 
    const playerAddress = window.sessionStorage.getItem("address");
    const resolveResult = await resolveGame(playerAddress, randomNumber);

    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        rowIndex === x && colIndex === y
          ? {
              ...cell,
              revealed: true,
              type: resolveResult === "win" ? "diamond" : "mine",
            }
          : cell
      )
    );

    setGrid(newGrid);

    if (resolveResult === "loss") {
      setGameOver(true);
      setGameStarted(false);
      toast.error("Game Over! You hit a mine.");
    } else if (resolveResult === "win") {
      const playerSession = await getSessionWithPublicKey(playerAddress);
      const multiplier = playerSession?.multiplier || 1;
      setScore(score * multiplier);
      toast.success(`You found a diamond! Current multiplier: x${multiplier}`);
    }
  };



  const cashOut = async () => {
    const address = window.sessionStorage.getItem("address");
    const amount = await claimWinning(address);
    toast.promise(cashit(2), {
      loading: "Cashing out...",
      success: `You have cashed out ${amount}!`,
      error: "Error cashing out",
    });
    setGameStarted(false);
    setBetAmount(0);
    setNumMines(1);
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

  const StartGame = () => {
    if (betAmount === 0) {
      toast.error("Please enter the bet amount");
      return;
    }
    console.log(betAmount);
    
    setGameStarted(true);
    generateGrid();
  };

  const handlePlaceBet = async () => {
    const userAddress = window.sessionStorage.getItem("address");
    const chainId = window.sessionStorage.getItem("chain_id");
    if(!userAddress|| userAddress==="" || !chainId || chainId===""){
      toast.error("Please connect your wallet");
      return;
    }
    if (betAmount === 0) {
      toast.error("Please enter the bet amount");
      return;
    }
    if (!userAddress || !window.sessionStorage.getItem("chain_id")) {
      toast.error("Please connect your wallet");
      return;
    }
    const placeBetRes = await placeBet(betAmount, userAddress, numMines);
    if (placeBetRes) {
      toast.success("Bet placed successfully. You can start the game now.");
      setGameStarted(true);
    } else {
      toast.error("Error placing bet");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex">
      <Toaster />
      {/* Sidebar */}
      <div className="bg-neutral-800 p-6 shadow-lg w-[40%]">
        <h1 className="text-2xl text-yellow-400 font-bold m-2">ChainGamble</h1>
        <button
          onClick={() =>
            Claimfxn(
              "nibi",
              Token,
              5,
              "nibi1ee4egg3hnvu930sphvwq9kesrc9u52fftexxpu",
              "nibiru"
            )
          }
        >
          Placebet
        </button>

        {/* Bet Amount */}
        <div className="space-y-2">
          <span className="block text-white text-lg font-semibold">Bet Amount</span>
          <div className="flex items-center space-x-4">
            <button onClick={() => setBetAmount(1)} className="bg-gray-700 text-white px-4 py-2 rounded-lg">
              Min
            </button>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              className="text-center bg-gray-700 text-white w-24 py-2 rounded-lg"
            />
            <button onClick={() => setBetAmount(100)} className="bg-gray-700 text-white px-4 py-2 rounded-lg">
              Max
            </button>
          </div>
          <button
            onClick={handlePlaceBet}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 px-4 rounded-lg w-full shadow-lg hover:scale-105 transition-transform"
          >
            Place Bet
          </button>
        </div>

        {/* Mines Selector */}
        <div className="space-y-2">
          <span className="block text-white text-lg font-semibold">Mines (Diamonds)</span>
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
        <div className="space-y-2">
          <span className="block text-white text-lg font-semibold">Score</span>
          <div className="flex items-center">
            <span className="text-3xl text-yellow-400 font-bold">{score}</span>
          </div>
        </div>

        {/* Start Game or Cash Out Button */}
        <button
          onClick={gameStarted ? cashOut : StartGame} // Conditional function call
          className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 text-lg font-semibold rounded-lg w-full shadow-lg hover:scale-105 transition-transform"
        >
          {gameStarted ? "Cash Out" : "Start Game"}
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
