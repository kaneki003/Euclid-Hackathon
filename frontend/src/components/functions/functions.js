// bet placing functions

import axios from "axios";
import createClient from "@andromedaprotocol/andromeda.js/dist/clients";
import {
  NibiruTxClient,
  Testnet,
  newSignerFromMnemonic,
} from "@nibiruchain/nibijs";

import { Registry } from "@cosmjs/proto-signing";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

const commonAddress = import.meta.env.VITE_WALLET_ADDRESS;

const commonadd_chain_uid = "nibiru";
const common_token_id = "nibi";
const commonadd_chain_id = "nibiru-testnet-1";
const commonadd_rpc_url = "https://rpc.testnet-1.nibiru.fi";
const SwapUrl = "https://testnet.api.euclidprotocol.com/api/v1/execute/swap";
const mnemonic = import.meta.env.VITE_MNEMONIC;

const getRoutes = async (token_in, token_out, amount) => {
  const payload = {
    amount_in: amount,
    token_in: token_in,
    token_out: token_out,
  };

  try {
    console.log(amount); // Log the amount for debugging

    const response = await axios.post(
      "https://testnet.api.euclidprotocol.com/api/v1/routes",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const route = response.data.paths[0].route;
    console.log(route); // Optional: Log the route for debugging
    return route; // Return the route
  } catch (error) {
    console.error("Error fetching routes:", error); // Handle errors
    return null; // Optionally return null or an appropriate error value
  }
};

const tokenDenom = async (chainuid, tokenid) => {
  console.log(chainuid, tokenid);

  const payload = {
    query: `
      query Escrow($chainUid: String!, $tokenId: String) {
       factory(chain_uid: $chainUid) {
          escrow(token_id: $tokenId) {
            denoms {
              ... on SmartTokenType {
                smart {
                  contract_address
                }
              }
              ... on NativeTokenType {
                native {
                  denom
                }
              }
            }
          }
        }
      }
    `,
    variables: {
      chainUid: chainuid,
      tokenId: tokenid,
    },
  };

  try {
    // Make the POST request using Axios
    console.log(chainuid, tokenid);
    const response = await axios.post(
      "https://testnet.api.euclidprotocol.com/graphql",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const denomData = response.data.data.factory.escrow.denoms[0];
    console.log("Full response data:", JSON.stringify(response.data, null, 2));
    return denomData;
  } catch (err) {
    console.error("Error fetching token denom:", err);
    return null;
  }
};

const getdecimals = async (tokenId) => {
  const payload = {
    query: `
      query Token_metadata_by_id($tokenId: String!) {
        token {
          token_metadata_by_id(token_id: $tokenId) {
            coinDecimal
          }
        }
      }
    `,
    variables: {
      tokenId: tokenId,
    },
  };

  try {
    // Make the POST request using Axios
    const response = await axios.post(
      "https://testnet.api.euclidprotocol.com/graphql",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Store the coinDecimal from the response
    const coinDecimal =
      response.data.data.token.token_metadata_by_id.coinDecimal;
    console.log(coinDecimal); // Optional: Log the value for debugging

    return coinDecimal; // Return the value
  } catch (err) {
    console.error("Error fetching decimals:", err); // Handle errors
    return null; // Optionally return null or an appropriate error value
  }
};

const prefixaddress = async (chainuid) => {
  const payload = {
    query: `
      query Keplr_config($chainUid: String) {
        chains {
          keplr_config(chain_uid: $chainUid) {
            bech32Config {
              bech32PrefixAccAddr
            }
          }
        }
      }
    `,
    variables: {
      chainUid: chainuid,
    },
  };

  try {
    // Make the POST request using Axios
    const response = await axios.post(
      "https://testnet.api.euclidprotocol.com/graphql",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Access and store the response
    const bech32PrefixAccAddr =
      response.data.data.chains.keplr_config.bech32Config.bech32PrefixAccAddr;
    console.log(bech32PrefixAccAddr); // Optional: Log the value for debugging

    return bech32PrefixAccAddr; // Return the value here
  } catch (err) {
    console.error("Error fetching prefix address:", err); // Handle errors
    return null; // Optionally return null or an appropriate error value
  }
};

const executeSwapfxn = async (
  token_in,
  token_out,
  amount,
  senderAddress,
  receiverAddr,
  chainuid,
  recever_chainuid
) => {
  const Swaproutes = await getRoutes(token_in, token_out, amount.toString());
  const decimal = await getdecimals(token_in);
  const denom = await tokenDenom(chainuid, token_in);
  const headers = {
    accept: "application/json",
    "Content-Type": "application/json",
  };

  const body = {
    amount_in: (amount * Math.pow(10, decimal)).toFixed(0), // Convert to integer string
    asset_in: {
      token: token_in,
      token_type: denom,
    },
    asset_out: token_out,
    cross_chain_addresses: [
      {
        limit: null,
        user: {
          address: receiverAddr,
          chain_uid: recever_chainuid,
        },
      },
    ],
    min_amount_out: "1",
    partner_fee: null,
    sender: {
      address: senderAddress,
      chain_uid: chainuid,
    },
    swaps: Swaproutes,
    timeout: null,
  };

  const response = await axios.post(SwapUrl, body, { headers });
  console.log(response.data);
  return response.data;
};

const simulateSwap = async (token_in, token_out, amount_in) => {
  if (token_in == token_out) return amount_in;
  const Swaproutes = await getRoutes(token_in, token_out, amount_in.toString());
  const decimal = await getdecimals(token_in);
  const decimal_out = await getdecimals(token_out);
  const url = "https://testnet.api.euclidprotocol.com/graphql";
  const payload = {
    query: `
      query Simulate_swap($assetIn: String!, $amountIn: String!, $assetOut: String!, $minAmountOut: String!, $swaps: [String!]) {
        router {
          simulate_swap(
            asset_in: $assetIn,
            amount_in: $amountIn,
            asset_out: $assetOut,
            min_amount_out: $minAmountOut,
            swaps: $swaps
          ) {
            amount_out
            asset_out
          }
        }
      }
    `,
    variables: {
      assetIn: token_in,
      amountIn: (amount_in * Math.pow(10, decimal)).toFixed(0),
      assetOut: token_out,
      minAmountOut: "1",
      swaps: Swaproutes,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(
      "Simulate Swap Response:",
      response.data.data.router.simulate_swap
    );
    return (
      Number(response.data.data.router.simulate_swap.amount_out) /
      Math.pow(10, decimal_out)
    );
  } catch (error) {
    console.error("Error in simulateSwap:", error);
    throw error;
  }
};

export const Placebet = async (token_in, amount, senderAddress, network) => {
  try {
    console.log("trying", token_in, amount, senderAddress, network.chain_uid);

    const response = await executeSwapfxn(
      token_in,
      common_token_id,
      amount,
      senderAddress,
      commonAddress,
      network.chain_uid,
      commonadd_chain_uid
    );
    const Prefixaddres = await prefixaddress(network.chain_uid);
    const offlineSigner = window.leap.getOfflineSigner(network.chain_id);
    const client = createClient(Prefixaddres);
    await client.connect(response.rpc_url, offlineSigner);

    const encodedMsgs = response.msgs.map((msg) => {
      if (msg.msg && msg.msg.send) {
        const swapmsg = {
          type: "swap", // Set the type to 'swap'
          value: {
            amount_in: msg.msg.send.amount_in, // Ensure these properties exist
            asset_in: msg.msg.send.asset_in,
            asset_out: msg.msg.send.asset_out,
            // Include any other necessary fields that the swap requires
            cross_chain_addresses: msg.msg.send.cross_chain_addresses || [],
            min_amount_out: msg.msg.send.min_amount_out || "0",
            timeout: msg.msg.send.timeout || null,
          },
        };
        console.log(swapmsg.type);
        // Encode the swap message
        return client.encodeExecuteMsg(msg.contractAddress, swapmsg, [
          ...(msg.funds || []),
        ]);
      }

      // If the msg is not of type 'send', encode as is
      return client.encodeExecuteMsg(msg.contractAddress, msg.msg, [
        ...(msg.funds || []),
      ]);
    });

    console.log(encodedMsgs);
    const denom = await tokenDenom(network.chain_uid, token_in);
    const fee = {
      amount: [{ denom: denom.native.denom, amount: "5000" }],
      gas: "2000000",
    };

    if (network.chain_uid === "nibiru") {
      const decimal = await getdecimals(token_in);
      const amount1 = {
        denom: "unibi",
        amount: (amount * Math.pow(10, decimal)).toString(),
      };

      const result = await client.sendTokens(
        commonAddress,
        [amount1],
        fee,
        "Send tokens"
      );
      console.log(result);
      return true;
    }

    const tx = await client.signAndBroadcast(encodedMsgs, fee, "Swap");
    console.log(tx);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const Claimfxn = async (token_out, amount, receiverAddr, chain_uid) => {
  try {
    const giving_amount = await simulateSwap(
      token_out,
      common_token_id,
      amount
    );
    console.log(giving_amount);

    const response = await executeSwapfxn(
      common_token_id,
      token_out,
      giving_amount,
      commonAddress,
      receiverAddr,
      commonadd_chain_uid,
      chain_uid
    );
    const Prefixaddres = await prefixaddress(commonadd_chain_uid);
    const client1 = createClient(Prefixaddres);

    const registry = new Registry();
    registry.register(
      "/cosmwasm.wasm.v1.MsgExecuteContract",
      MsgExecuteContract
    );
    const chain = Testnet();
    let signer = await newSignerFromMnemonic(mnemonic);
    await client1.connect(commonadd_rpc_url, signer);
    const client = await NibiruTxClient.connectWithSigner(
      commonadd_rpc_url,
      signer,
      { registry }
    );

    const encodedMsgs = response.msgs.map((msg) => {
      if (msg.msg && msg.msg.send) {
        const swapmsg = {
          type: "swap", // Set the type to 'swap'
          value: {
            amount_in: msg.msg.send.amount_in, // Ensure these properties exist
            asset_in: msg.msg.send.asset_in,
            asset_out: msg.msg.send.asset_out,
            // Include any other necessary fields that the swap requires
            cross_chain_addresses: msg.msg.send.cross_chain_addresses || [],
            min_amount_out: msg.msg.send.min_amount_out || "0",
            timeout: msg.msg.send.timeout || null,
          },
        };
        console.log(swapmsg.type);
        // Encode the swap message
        return client1.encodeExecuteMsg(msg.contractAddress, swapmsg, [
          ...(msg.funds || []),
        ]);
      }

      // If the msg is not of type 'send', encode as is
      return client1.encodeExecuteMsg(msg.contractAddress, msg.msg, [
        ...(msg.funds || []),
      ]);
    });
    if (token_out === "nibi") {
      const decimal = await getdecimals(common_token_id);
      const amount1 = {
        denom: "unibi",
        amount: (amount * Math.pow(10, decimal)).toString(),
      };

      const result = await client.sendTokens(
        commonAddress,
        receiverAddr,
        [amount1],
        "auto",
        "Send tokens"
      );

      console.log(result);
      return true;
    }
    // console.log(encodedMsgs,token_out);

    console.log("testup,signupbroadcast", encodedMsgs, commonAddress);

    const tx = await client.signAndBroadcast(
      commonAddress,
      encodedMsgs,
      "auto",
      "Swap"
    );
    console.log(tx);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
