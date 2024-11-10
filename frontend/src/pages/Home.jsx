import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  claimWinning,
  resolveGame,
  placeBet,
  getSessionWithPublicKey,
} from "../ContractFunctions/functions.js";
import { Placebet, Claimfxn } from "../EuclidSwapfunctions/functions.js";
import { Slider } from "antd";

const GRID_SIZE = 5;
const MAX_MINES = 25;

function Home() {
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [numMines, setNumMines] = useState(1);
  const [betAmount, setBetAmount] = useState(0);
  const [diamondCount, setDiamondCount] = useState(0);
  const [multiplier, setMultiplier] = useState(100000000);

  const maxDiamondCount = 25 - numMines;

  const generateGrid = () => {
    const newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill({ type: "empty", revealed: false }));
    setGrid(newGrid);
    setDiamondCount(0);
    setMultiplier(100000000);
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
        const history =
          JSON.parse(window.localStorage.getItem("history")) || [];
        const currentSession = {
          timestamp: new Date().toISOString(),
          address: playerAddress,
          betAmount: betAmount,
          mines: numMines,
          result: "Loss",
          profit: `${0}%`,
        };
        history.push(currentSession);
        window.localStorage.setItem("history", JSON.stringify(history));
        toast.error("Game Over! You hit a mine.");
        setGameOver(true);
        setGameStarted(false);
        setBetAmount(0);
        setNumMines(1);
      } else {
        const playerSession = await getSessionWithPublicKey(playerAddress);
        const currentMultiplier = playerSession?.multiplier || 1;

        setMultiplier(currentMultiplier);
        setDiamondCount((prev) => prev + 1);
        toast.success(
          `You found a diamond! Multiplier: x${(
            currentMultiplier / 100000000
          ).toFixed(2)}`
        );
      }
    } catch (error) {
      toast.error("Error resolving game");
    }
  };

  const cashOut = async () => {
    toast.promise(
      (async () => {
        const address = window.sessionStorage.getItem("address");
        const amount =
          multiplier == 1 ? betAmount : await claimWinning(address);
        const userAddress = window.sessionStorage.getItem("address");
        const token_in = window.sessionStorage.getItem("token");
        const chanUid = window.sessionStorage.getItem("chain_uid");
        const res = await Claimfxn(token_in, amount, userAddress, chanUid);
        const history =
          JSON.parse(window.localStorage.getItem("history")) || [];
        const currentSession = {
          timestamp: new Date().toISOString(),
          address: address,
          betAmount: betAmount,
          mines: numMines,
          result: "Win",
          profit: `${(((amount - betAmount) / betAmount) * 100).toFixed(2)}%`,
        };
        history.push(currentSession);
        window.localStorage.setItem("history", JSON.stringify(history));
        generateGrid();
        setGameStarted(false);
        setGameOver(true);
        setBetAmount(0);
        setNumMines(1);
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
  };

  const increaseMines = () => {
    if (numMines < MAX_MINES) setNumMines((prevMines) => prevMines + 1);
  };

  const decreaseMines = () => {
    if (numMines > 1) setNumMines((prevMines) => prevMines - 1);
  };

  const StartGame = async () => {
    if (betAmount === 0) {
      toast.error("Please enter the bet amount");
      return;
    }
    setGameStarted(true);
    try {
      await handlePlaceBet();
      generateGrid();
    } catch (error) {
      console.log(error);
    }
  };

  const handlePlaceBet = async () => {
    const userAddress = window.sessionStorage.getItem("address");
    const chainId = window.sessionStorage.getItem("chain_id");
    const token_in = window.sessionStorage.getItem("token");
    const network = {
      chain_uid: window.sessionStorage.getItem("chain_uid"),
      chain_id: chainId,
    };

    if (!userAddress || !chainId || !network.chain_uid) {
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
          const placeBetRes1 = await Placebet(
            token_in,
            betAmount,
            userAddress,
            network
          );
          const placeBetRes = await placeBet(betAmount, userAddress, numMines);

          if (!placeBetRes1) {
            throw new Error("Bet Request rejected");
          }
          if (placeBetRes && placeBetRes1) {
            setGameStarted(true);
            setGameOver(false);
            return "Bet placed successfully! Start the game now.";
          } else {
            throw new Error("Error placing bet");
          }
        })(),
        {
          loading: "Placing bet...",
          success: () => "Bet placed successfully! Start the game now.",
          error:
            placeBetRes1 === false
              ? "Bet Request rejected"
              : "Error placing bet",
        }
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col justify-center items-center lg:flex-row p-6 px-12 gap-4">
      <Toaster />
      {/* Sidebar */}
      <div className="bg-gray-800 flex flex-col items-center justify-center py-4 px-4 h-[90vh] rounded-lg shadow-lg lg:w-1/4 space-y-5 lg:mb-0">
        <div className="flex flex-col gap-2 w-full bg-gray-900 px-4 py-6 h-1/5 justify-center rounded-lg font-semibold shadow-md">
          <div className="text-2xl text-gray-400">Player Address</div>
          <div className="text-lg text-yellow-400">
            {window.sessionStorage.getItem("address")
              ? `${window.sessionStorage
                  .getItem("address")
                  .slice(0, 6)}...${window.sessionStorage
                  .getItem("address")
                  .slice(-4)}`
              : "Not Connected"}
          </div>
        </div>

        {/* Bet Amount */}
        <div className="space-y-2 flex flex-col gap-2 w-full bg-gray-900 px-4 py-16  h-1/5 justify-center rounded-lg font-semibold shadow-md">
          <span className="block text-2xl text-gray-400">Bet Amount</span>
          <div className="flex items-center justify-between space-x-2">
            <button
              onClick={() => setBetAmount(1)}
              className="bg-gray-700 text-white px-4 py-1 rounded-lg"
            >
              Min
            </button>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              className="text-center text-sm bg-gray-900 text-yellow-400 border-2 border-gray-700 w-full py-1 rounded-lg"
            />
            <button
              onClick={() => setBetAmount(100)}
              className="bg-gray-700 text-white px-4 py-1 rounded-lg"
            >
              Max
            </button>
          </div>
          <Slider
            min={1}
            max={100}
            value={betAmount}
            onChange={(value) => setBetAmount(value)}
            className="w-full custom-slider"
          />
        </div>

        {/* Mines Selector */}
        <div className="space-y-2 flex flex-col gap-2 w-full bg-gray-900 px-4 py-16 h-1/5 justify-center rounded-lg font-semibold shadow-md">
          <span className="block text-2xl text-gray-400">Mines</span>
          <div className="flex items-center justify-between space-x-2">
            <button
              onClick={decreaseMines}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              -
            </button>
            <input
              type="text"
              value={numMines}
              className="text-center bg-gray-900 text-yellow-400 border-2 border-gray-700 w-full py-2 rounded-lg"
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

        {/* Score and Multiplier */}
        <div className="space-y-2 flex flex-col gap-2 w-full bg-gray-900 px-4 py-16 h-1/5 justify-center rounded-lg font-semibold shadow-md">
          <span className="block text-2xl text-gray-400">Multiplier</span>
          <span className="text-5xl font-bold  text-yellow-300 flex items-center justify-center">
            x{(multiplier / 100000000).toFixed(2)}
          </span>
        </div>

        {/* Start Game or Cash Out Button */}
        <button
          onClick={gameStarted ? cashOut : StartGame}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 text-lg font-semibold rounded-lg w-full hover:scale-105 transition-transform"
        >
          {gameStarted ? "Cash Out" : "Place Bet & Start Game"}
        </button>
      </div>

      {/* Game Grid */}
      <div className="h-[90vh] rounded-lg lg:w-3/4 flex items-center justify-center mt-6 py-2 lg:mt-0 bg-gray-800 relative">
        <div
          className={`grid grid-cols-5 w-full h-full items-center lg:pl-[6vw] ${
            !gameStarted ? "pointer-events-none" : ""
          }`}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleClick(rowIndex, colIndex)}
                className={`aspect-square w-[7vw] h-[7vw] rounded-lg border border-neutral-700 flex justify-center items-center cursor-pointer transform transition-transform  ${
                  cell.revealed
                    ? cell.type === "mine"
                      ? "bg-red-600 border-red-500"
                      : cell.type === "diamond"
                      ? "bg-green-700 border-green-600"
                      : "bg-gray-600 border-gray-500"
                    : "bg-gradient-to-br from-gray-600 to-gray-800 shadow-lg hover:scale-105"
                }`}
                style={{
                  boxShadow: cell.revealed
                    ? "none"
                    : "0px 4px 10px rgba(0, 0, 0, 0.3)", // shadow for unrevealed tiles
                }}
              >
                {cell.revealed ? (
                  <span className="text-3xl">
                    {" "}
                    {/* Larger size for revealed icons */}
                    {cell.type === "mine"
                      ? "💣"
                      : cell.type === "diamond"
                      ? "💎"
                      : ""}
                  </span>
                ) : (
                  <span className="text-4xl font-semibold text-gray-400 hover:text-black transition-colors duration-300 ease-in-out">{`?`}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
