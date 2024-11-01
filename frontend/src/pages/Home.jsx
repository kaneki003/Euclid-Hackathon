import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { claimWinning, resolveGame, placeBet, getSessionWithPublicKey } from "../ContractFunctions/functions.js";
import { Placebet, Claimfxn } from "../components/functions/functions.js";

const GRID_SIZE = 5;
const MAX_MINES = 25;

function Home({ Token, network, Address }) {
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [numMines, setNumMines] = useState(1);
  const [betAmount, setBetAmount] = useState(0);
  const [diamondCount, setDiamondCount] = useState(0); // Track diamond count
  const [multiplier, setMultiplier] = useState(100000000); // Track current multiplier

  const maxDiamondCount = 25 - numMines;

  const generateGrid = () => {
    const newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill({ type: "empty", revealed: false }));
    setGrid(newGrid);
    setDiamondCount(0); // Reset diamond count when grid is generated
    setMultiplier(100000000); // Reset multiplier when grid is generated
  };

  useEffect(() => {
    if (gameStarted) {
      generateGrid();
    }
  }, [gameStarted]);

  const handleClick = async (x, y) => {
    if (gameOver || grid[x][y].revealed || diamondCount >= maxDiamondCount) {
      if (diamondCount >= maxDiamondCount) {
        toast("Maximum diamond count reached. Please Cash Out.");
      }
      return;
    }

    const playerAddress = window.sessionStorage.getItem("address");

    try {
      toast.loading("Resolving game...", { id: "resolve" });
      const resolveResult = await resolveGame(playerAddress);
      toast.dismiss("resolve");

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
      } else {
        const playerSession = await getSessionWithPublicKey(playerAddress);
        const currentMultiplier = playerSession?.multiplier || 1;
        
        setScore((prevScore) => prevScore * currentMultiplier);
        setMultiplier(currentMultiplier); // Update multiplier state
        setDiamondCount((prev) => prev + 1); // Increment diamond count
        toast.success(`You found a diamond! Multiplier: x${(currentMultiplier/100000000).toFixed(2)}`);
      }
    } catch (error) {
      toast.error("Error resolving game");
      console.error(error);
    }
  };

  const cashOut = async () => {
    const address = window.sessionStorage.getItem("address");

    toast.promise(
      (async () => {
        const amount = score === 0 ? betAmount : await claimWinning(address);
        const userAddress = window.sessionStorage.getItem("address");
        const token_in = window.sessionStorage.getItem("token");
        const chanUid = window.sessionStorage.getItem("chain_uid");

        const res = await Claimfxn(token_in, amount, userAddress, chanUid);
        if (res) {
          return amount;
        } else {
          throw new Error("Error cashing out");
        }
      })(),
      {
        loading: "Cashing out...",
        success: (amount) => `You have cashed out ${amount}!`,
        error: "Error cashing out",
      }
    );

    setGameStarted(false);
    setBetAmount(0);
    setNumMines(1);
  };

  const increaseMines = () => {
    if (numMines < MAX_MINES) setNumMines((prevMines) => prevMines + 1);
  };

  const decreaseMines = () => {
    if (numMines > 1) setNumMines((prevMines) => prevMines - 1);
  };

  const StartGame = () => {
    if (betAmount === 0) {
      toast.error("Please enter the bet amount");
      return;
    }
    setGameStarted(true);
    generateGrid();
  };

  const handlePlaceBet = async () => {
    const userAddress = window.sessionStorage.getItem("address");
    const chainId = window.sessionStorage.getItem("chain_id");
    const token_in = window.sessionStorage.getItem("token");
    const network = {
      chain_uid: window.sessionStorage.getItem("chain_uid"),
      chain_id: chainId,
      rpc_url: import.meta.env.VITE_JSON_RPC_ENDPOINT,
    };

    if (!userAddress || !chainId || !network.chain_uid || !network.rpc_url) {
      toast.error("Please connect your wallet and select a network");
      return;
    }

    if (betAmount === 0) {
      toast.error("Please enter the bet amount");
      return;
    }

    try {
      let placeBetRes1 = false;
      await toast.promise(
        (async () => {
          const placeBetRes1 = await Placebet(token_in, betAmount, userAddress, network);
          const placeBetRes = await placeBet(betAmount, userAddress, numMines);

          if (!placeBetRes1) {
            throw new Error("Bet Request rejected");
          }
          if (placeBetRes && placeBetRes1) {
            setGameStarted(true);
            return "Bet placed successfully! Start the game now.";
          } else {
            throw new Error("Error placing bet");
          }
        })(),
        {
          loading: "Placing bet...",
          success: (message) => message,
          error: placeBetRes1 === false ? "Bet Request rejected" : "Error placing bet",
        }
      );
    } catch (error) {
      console.error("Error placing bet:", error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col lg:flex-row p-4">
      <Toaster />
      {/* Sidebar */}
      <div className="bg-neutral-800 p-6 shadow-lg h-[90vh] w-full lg:w-1/3 space-y-6  lg:mb-0">
        <h1 className="text-3xl text-yellow-400 font-bold text-center lg:text-left">ChainGamble</h1>

        {/* Bet Amount */}
        <div className="space-y-2 ">
          <span className="block text-white text-xl font-semibold">Bet Amount</span>
          <div className="flex gap-2 flex-wrap md:justify-between justify-center">
            <div>
              <div className="items-center space-x-2">
                <button onClick={() => setBetAmount(1)} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Min</button>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                  className="text-center bg-gray-700 text-white w-24 py-2 rounded-lg"
                />
                <button onClick={() => setBetAmount(100)} className="bg-gray-700 text-white px-4 py-2 rounded-lg">Max</button>
              </div>
            </div>
            <button
              onClick={handlePlaceBet}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold text-xl py-1 px-4 rounded-lg shadow-lg hover:scale-105 transition-transform"
            >
              Place Bet
            </button>
          </div>
        </div>

        {/* Mines Selector */}
        <div className="space-y-2">
          <span className="block text-white text-xl font-semibold">Mines (Diamonds)</span>
          <div className="flex items-center space-x-2">
            <button onClick={decreaseMines} className="bg-gray-700 text-white px-4 py-2 rounded-lg">-</button>
            <input
              type="text"
              value={numMines}
              className="text-center bg-gray-700 text-white w-20 py-2 rounded-lg"
              readOnly
            />
            <button onClick={increaseMines} className="bg-gray-700 text-white px-4 py-2 rounded-lg">+</button>
          </div>
        </div>

        {/* Score and Multiplier */}
        <div className="space-y-1">
          <span className="block text-white text-lg font-semibold">Score</span>
          <div className="flex items-center justify-center lg:justify-start space-x-4">
            <span className="text-2xl text-yellow-400 font-bold">{score}</span>
            <span className="text-xl text-white">Multiplier: x{multiplier/100000000}</span>
          </div>
        </div>

        {/* Start Game or Cash Out Button */}
        <button
          onClick={gameStarted ? cashOut : StartGame}
          className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 text-2xl font-semibold rounded-lg w-full shadow-lg hover:scale-105 transition-transform"
        >
          {gameStarted ? "Cash Out" : "Start Game"}
        </button>

      </div>

      {/* Game Grid */}
      <div className="w-full lg:w-2/3 flex items-center justify-center">
        <div className="grid grid-cols-5 gap-2 w-full max-w-md mx-auto">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleClick(rowIndex, colIndex)}
                className={`w-full aspect-square rounded-md border-2 border-neutral-600 flex justify-center items-center cursor-pointer transform transition-transform duration-500 ${
                  cell.revealed
                    ? cell.type === "mine"
                      ? "bg-red-600 border-red-500"
                      : cell.type === "diamond"
                      ? "bg-green-600 border-green-500"
                      : "bg-gray-600 border-gray-500"
                    : "bg-neutral-800 hover:scale-105"
                }`}
              >
                {cell.revealed && (cell.type === "mine" ? "💣" : cell.type === "diamond" ? "💎" : "")}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
