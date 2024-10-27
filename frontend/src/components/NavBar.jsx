import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { useState, Fragment } from "react";
import { Avatar, Modal } from "antd";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar({
  Token,
  settoken,
  Address,
  setAddress,
  network,
  setNetwork,
}) {
  const [networks, setNetworks] = useState([]);
  const [Tokens, settokens] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const fetchTokens = async (chainuid) => {
    const payload = {
      query: `
      query Factory($chainUid: String!) {
        factory(chain_uid: $chainUid) {
          all_tokens {
            tokens
          }
        }
      }
    `,
      variables: { chainUid: chainuid },
    };

    try {
      const response = await axios.post(
        "https://testnet.api.euclidprotocol.com/graphql",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const tokens = response.data.data.factory.all_tokens.tokens;
      settokens(tokens);
      return tokens;
    } catch (error) {
      console.error("Error fetching tokens:", error);
      return null;
    }
  };

  const fetchNetworks = async () => {
    const data = await axios.get(
      "https://testnet.api.euclidprotocol.com/api/v1/chains"
    );
    setNetworks(data?.data);
    showModal();
  };

  const checkLeapWallet = async () => {
    if (typeof window.leap !== "undefined") {
      return true;
    } else {
      alert("Leap Wallet not installed");
      return false;
    }
  };

  const connectWallet = async () => {
    const leapAvailable = await checkLeapWallet();
    if (!leapAvailable) return;

    try {
      const key = await window.leap.getKey(network.chain_id);
      setAddress(key.bech32Address);
      window.sessionStorage.setItem("address", key.bech32Address);
      window.sessionStorage.setItem("chain_id", network.chain_id);
      await window.leap.enable(network.chain_id);
    } catch (error) {
      console.error("Error connecting to Leap Wallet:", error);
    }
  };

  return (
    <Disclosure
      as="nav"
      className="bg-neutral-800 text-white sticky top-0 w-full z-10 shadow-md"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <Disclosure.Button className="inline-flex items-center justify-center p-2 text-gray-400 hover:bg-neutral-700 hover:text-white rounded-md focus:outline-none">
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
            </Disclosure.Button>
          </div>
          <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex-shrink-0 text-2xl font-bold text-white">
              ChainGamble
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
            {Address ? (
              <div className="text-white bg-blue-600 px-4 py-2 rounded-md">
                {`${Address.slice(0, 6)}...${Address.slice(-4)}`}
              </div>
            ) : (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all"
                onClick={() => fetchNetworks()}
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      <Disclosure.Panel className="sm:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {/* Mobile menu items */}
          <Disclosure.Button
            as="button"
            className="w-full text-center block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-neutral-700"
            onClick={() => {
              if (!Address) {
                fetchNetworks();
              }
            }}
          >
            {Address
              ? `${Address.slice(0, 6)}...${Address.slice(-4)}`
              : "Connect"}
          </Disclosure.Button>
        </div>
      </Disclosure.Panel>

      <Modal
        title="Select Network"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        centered
        bodyStyle={{
          padding: "20px",
          backgroundColor: "#2D3748",
          borderRadius: "8px",
        }}
        titleStyle={{
          color: "#F6E05E",
          fontSize: "1.25rem",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        <div className="space-y-4">
          {networks?.map((network, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-neutral-700 hover:bg-neutral-600 cursor-pointer"
              onClick={() => {
                setNetwork(network);
                handleCancel();
                fetchTokens(network.chain_uid);
                setIsModalOpen2(true);
              }}
            >
              <Avatar src={network.logo} className="mr-3" />
              <div>
                <p className="text-white font-semibold">{network.chain_uid}</p>
                <p className="text-gray-400 text-sm">
                  Chain ID: {network.chain_id}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title="Select Token"
        open={isModalOpen2}
        onCancel={() => setIsModalOpen2(false)}
        footer={null}
        centered
        bodyStyle={{
          padding: "20px",
          backgroundColor: "#2D3748",
          borderRadius: "8px",
        }}
        titleStyle={{
          color: "#F6E05E",
          fontSize: "1.25rem",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        <div className="space-y-4">
          {Tokens?.map((token, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-neutral-700 hover:bg-neutral-600 cursor-pointer flex justify-between items-center"
              onClick={() => {
                settoken(token);
                setIsModalOpen2(false);
                connectWallet();
              }}
            >
              <p className="text-white font-semibold">{token}</p>
            </div>
          ))}
        </div>
      </Modal>
    </Disclosure>
  );
}
