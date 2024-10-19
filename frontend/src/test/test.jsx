import axios from "axios";
import createClient from "@andromedaprotocol/andromeda.js/dist/clients";


  
  const Injaddress= "Injective network address" //address where swapped tokens to be sended

  
  async function executeSwap() {
   const rpcUrl = "https://rpc.testnet-1.nibiru.fi";
   const chainId = "nibiru-testnet-1";
   // Ensure Keplr is enabled and connected
   if (window.getOfflineSigner && window.keplr){
     await window.keplr.enable(chainId);
   } else {
     console.error("Please install Keplr Wallet");
     return;
   }

   const offlineSigner = window.getOfflineSigner(chainId);
   console.log(offlineSigner);
   const accounts = await offlineSigner.getAccounts();
   const account = accounts[0];
   const senderAddress = account.address;

const client = createClient("nibi");
await client.connect(rpcUrl, offlineSigner, {
  gasPrice: "0.025unibi",
});


    
    const uri = "https://testnet.api.euclidprotocol.com/api/v1/execute/swap";
    const headers = {
      accept: "application/json",
      "Content-Type": "application/json",
    };
  
    const body = {
      amount_in: "10000000",
      asset_in: {
        token: "nibi",
        token_type: {
          native: {
            denom: "unibi",
          },
        },
      },
      asset_out: "inj",
      cross_chain_addresses: [
        {
          limit: null,
          user: {
            address: Injaddress,
            chain_uid: "injective",
          },
        },
      ],
      min_amount_out: "1",
      partner_fee: null,
      sender: {
        address: senderAddress,
        chain_uid: "nibiru",
      },
      swaps: ["nibi", "euclid", "inj"],
      timeout: null,
    };

    const fee = {
      amount: [{ denom: "unibi", amount: "5000" }],
      gas: "2000000", // Gas limit
    };

    try {
      const response = await axios.post(uri, body, { headers });
      console.log(response.data);
      const encodedMsgs = response.data.msgs.map((msg) =>{
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
  ])
}
      );
      console.log(encodedMsgs);
      
      const tx = await client.signAndBroadcast(
        encodedMsgs,
        fee,
        "Swap"
      );
      console.log(tx);
    } catch (error) {
      console.error("Error executing swap:", error);
      throw error;
    }
  }

function test() {

  return (
    <div>
      hi
      <button className="p-4 bg-red-600" onClick={() => executeSwap()}>
        Get Routes
      </button>
      <div></div>
    </div>
  );
}

export default test;
