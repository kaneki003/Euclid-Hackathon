import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { useState } from "react";
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
      variables: {
        chainUid: chainuid,
      },
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
      console.log(tokens);
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
    console.log(data?.data);
    setNetworks(data?.data);
    showModal();
  };

  const connectWallet = async () => {
    try {
      if (window.leap) {
        const key = await window.leap.getKey(network.chain_id);
        console.log("selected network address", key.bech32Address);
        setAddress(key.bech32Address);
        await window.leap.enable(network.chain_id);
      } else {
        alert("Leap Wallet not installed");
      }
    } catch (error) {
      console.error("Error connecting to Leap Wallet:", error);
    }
  };

  console.log(network);
  console.log(Token);
  return (
    <Disclosure
      as="nav"
      className="bg-neutral-800 text-white sticky top-0 left-0 w-full"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon
                aria-hidden="true"
                className="block h-6 w-6 group-data-[open]:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden h-6 w-6 group-data-[open]:block"
              />
            </DisclosureButton>
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex text-white text-2xl font-semibold flex-shrink-0 items-center">
              ChainGamble
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">{/* Add any buttons here */}</div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => {
                if (!Address) {
                  fetchNetworks();
                }
              }}
            >
              {Address
                ? Address.slice(0, 6) + "..." + Address.slice(38, 42)
                : "Connect"}
            </button>
            <Modal
              title="Select Network"
              open={isModalOpen}
              onCancel={handleCancel}
            >
              {networks?.map((network) => {
                return (
                  <div
                    className="flex items-center mb-4 cursor-pointer"
                    onClick={() => {
                      setNetwork(network);
                      handleCancel();
                      fetchTokens(network.chain_uid);
                      setIsModalOpen2(true);
                    }}
                  >
                    <Avatar src={network.logo} />
                    <div>
                      <p className="text-gray-700 font-medium">
                        Chain UID: {network.chain_uid}
                      </p>
                      <p className="text-gray-500">
                        Chain ID: {network.chain_id}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Modal>
            <Modal
              title="Select Coin"
              open={isModalOpen2}
              onCancel={() => setIsModalOpen2(false)}
            >
              {Tokens?.map((token) => {
                return (
                  <div
                    className="flex items-center mb-4 cursor-pointer"
                    onClick={() => {
                      settoken(token);
                      setIsModalOpen2(false);
                      connectWallet();
                    }}
                  >
                    <p className="text-gray-700 font-medium">Token: {token}</p>
                  </div>
                );
              })}
            </Modal>
            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <div>
                <MenuButton className="relative flex rounded-full bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-neutral-900">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Open user menu</span>
                  <img
                    alt="User"
                    src="https://randomuser.me/api/portraits/men/42.jpg"
                    className="h-8 w-8 rounded-full"
                  />
                </MenuButton>
              </div>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-neutral-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
              >
                <MenuItem>
                  <button className="block w-full px-4 py-2 text-sm text-white hover:bg-neutral-700">
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {/* Mobile menu items */}
          <DisclosureButton
            as="button"
            className="w-full text-center block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-neutral-800"
          >
            Button
          </DisclosureButton>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
