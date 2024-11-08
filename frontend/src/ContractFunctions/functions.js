import {
  NibiruTxClient,
  Testnet,
  newSignerFromMnemonic,
} from "@nibiruchain/nibijs";
import crypto from "crypto";

// // Access environment variables for Vite
const mnemonic = import.meta.env.VITE_MNEMONIC;
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

async function setup() {
  const chain = Testnet();
  let signer = await newSignerFromMnemonic(mnemonic);
  const txClient = await NibiruTxClient.connectWithSigner(
    chain.endptTm,
    signer
  );

  return { txClient };
}

// Get detail of all players playing currently the game
export async function getAllSessions() {
  const { txClient } = await setup();
  const queryMsg = { get_active_sessions: {} };
  const querySessions = await txClient.wasmClient.queryContractSmart(
    contractAddress,
    queryMsg
  );

  return querySessions;
}

//Get detail of a particular player with public key
export async function getSessionWithPublicKey(player) {
  const { txClient } = await setup();
  const queryMsg = {
    get_player_session: {
      player: player,
    },
  };
  const getSession = await txClient.wasmClient.queryContractSmart(
    contractAddress,
    queryMsg
  );

  return getSession;
}

// Starting game for a new player and recording his session
export async function placeBet(amount, player, mines) {
  try {
    const { txClient } = await setup();
    const executeMsg = {
      place_bet: {
        amount: amount.toString(),
        player: player,
        mines: mines.toString(),
      },
    };
    const result = await txClient.wasmClient.execute(
      "nibi1dl8l47asjs9jt3rzu9exs2alpr0fhtnf4nk9s2",
      contractAddress,
      executeMsg,
      "auto"
    );

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

function getSecureRandomInt(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return (array[0] % max) + 1;
}

//Getting result for whether player won or lost the game
export async function resolveGame(player) {
  let number = getSecureRandomInt(300000000);

  const { txClient } = await setup();
  const executeMsg = {
    resolve_game: {
      player: player,
      number: number.toString(),
    },
  };

  const result = await txClient.wasmClient.execute(
    "nibi1dl8l47asjs9jt3rzu9exs2alpr0fhtnf4nk9s2",
    contractAddress,
    executeMsg,
    "auto"
  );

  const txHash = result.transactionHash;
  const txResult = await txClient.getTx(txHash);
  const parsedLog = JSON.parse(txResult.rawLog);

  let resultValue = null;
  for (const entry of parsedLog) {
    for (const event of entry.events) {
      const resultAttr = event.attributes.find((attr) => attr.key === "result");
      if (resultAttr) {
        resultValue = resultAttr.value;
        break;
      }
    }
    if (resultValue) break;
  }

  return resultValue;
}

// Getting amount won by the player on ending session
export async function claimWinning(player) {
  const { txClient } = await setup();

  const executeMsg = {
    claim_winnings: {
      player: player,
    },
  };

  const result = await txClient.wasmClient.execute(
    "nibi1dl8l47asjs9jt3rzu9exs2alpr0fhtnf4nk9s2",
    contractAddress,
    executeMsg,
    "auto"
  );

  const txHash = result.transactionHash;
  const txResult = await txClient.getTx(txHash);
  const parsedLog = JSON.parse(txResult.rawLog);

  // Check the parsed log for an "amount" attribute
  let resultValue = null;
  for (const entry of parsedLog) {
    for (const event of entry.events) {
      const resultAttr = event.attributes.find((attr) => attr.key === "amount");
      if (resultAttr) {
        resultValue = resultAttr.value;
        break;
      }
    }
    if (resultValue) break;
  }

  if (resultValue !== null) {
    return parseFloat(resultValue); // Assuming resultValue is numeric
  } else {
    throw new Error("Claim winning failed, amount not found.");
  }
}
