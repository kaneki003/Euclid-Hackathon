// bet placing functions

import axios from "axios";
// import createClient from "@andromedaprotocol/andromeda.js/dist/clients";

const receiverAddress = "nibi1g5pqjs88ed2737jf9p0xt8qc30hjux6sw9czdg";
const SwapUrl = "https://testnet.api.euclidprotocol.com/api/v1/execute/swap";

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
    const denomData = response.data.data.factory.escrow.denoms[0];
    console.log(denomData); // Optional: Log the value for debugging

    return denomData; // Return the value here
  } catch (err) {
    console.error("Error fetching token denom:", err); // Handle errors
    return null; // Optionally return null or an appropriate error value
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
  chainuid
) => {
  const Swaproutes = await getRoutes(token_in, token_out, amount.toString());
  const headers = {
    accept: "application/json",
    "Content-Type": "application/json",
  };
  const decimal = await getdecimals(token_in);
  const denom = await tokenDenom(chainuid, token_in);
  const body = {
    amount_in: (amount * Math.pow(10, decimal)).toString(),
    asset_in: {
      token: token_in,
      token_type: denom,
    },
    asset_out: token_out,
    cross_chain_addresses: [
      {
        limit: null,
        user: {
          address: receiverAddress,
          chain_uid: "nibiru",
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

export const Placebet = async (
  token_in,
  token_out,
  amount,
  senderAddress,
  network
) => {
  try {
    const response = await executeSwapfxn(
      token_in,
      token_out,
      amount,
      senderAddress,
      network.chain_uid
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
      const recipientAddress = "nibi1ee4egg3hnvu930sphvwq9kesrc9u52fftexxpu";

      const result = await client.sendTokens(
        recipientAddress,
        [amount1],
        fee,
        "Send tokens"
      );
      console.log(result);
      return;
    }

    const tx = await client.signAndBroadcast(encodedMsgs, fee, "Swap");
    console.log(tx);
  } catch (error) {
    console.log(error);
  }
};
