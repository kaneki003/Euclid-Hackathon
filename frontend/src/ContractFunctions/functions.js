const {
  NibiruTxClient,
  Testnet,
  newSignerFromMnemonic,
} = require("@nibiruchain/nibijs");
require("dotenv").config();

const mnemonic = process.env.MNEMONIC;
const contractAddress = process.env.CONTRACT_ADDRESS;

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
async function getAllSessions() {
  const { txClient } = await setup();
  const queryMsg = { get_active_sessions: {} };
  const querySessions = await txClient.wasmClient.queryContractSmart(
    contractAddress,
    queryMsg
  );

  console.log("Query Result:", querySessions);
}

//Get detail of a particular player with public key
async function getSessionWithPublicKey(player) {
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

  console.log("Player Session:", getSession);
}

// Starting game for a new player and recording his session
async function placeBet(amount, player, mines) {
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

  console.log("Place Bet Result:", result);
}

//Getting result for whether player won or lost the game
async function resolveGame(player, number) {
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

  console.log("Game Result Value:", resultValue);
}

// Getting amount won by the player on ending session
async function claimWinning(player) {
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

  console.log("Game Result Value:", resultValue);
}

// Example API calls
// getAllSessions().catch(console.error);
// getSessionWithPublicKey("nibi18veje0qj69perf75j25wznj8cfxwxld54ssxqp").catch(
//   console.error
// );
// placeBet(10000, "nibi18veje0qj69perf75j25wznj8cfxwxld54ssxqp", 10).catch(
//   console.error
// );
// resolveGame("nibi18veje0qj69perf75j25wznj8cfxwxld54ssxqp", "1").catch(
//   console.error
// );
// claimWinning("nibi18veje0qj69perf75j25wznj8cfxwxld54ssxqp").catch(
//   console.error
// );
