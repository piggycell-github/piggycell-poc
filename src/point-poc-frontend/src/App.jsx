import React, { useState, useEffect } from "react";
import {
  createActor,
  canisterId,
  point_poc_backend,
} from "declarations/point-poc-backend";
import { AuthClient } from "@dfinity/auth-client";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

const userPem = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEID8yHjF4If/Ko3tq+InD+/AVlziklNZnlF/CZ5vGtSwloAcGBSuBBAAK
oUQDQgAERmaLMVW7Y4Mzqvo3WseQfmyRr0O9i2NHAQr8yWjmgj/0OsXB+p4IwGSL
pAMcoUS3Mave8bYmCZn94+EVH6n7Nw==
-----END EC PRIVATE KEY-----`;

const adminPem = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIPni6aE5QHw/GWLGZHJgf5TCJNPFpoI26mzlW/QyMvRooAcGBSuBBAAK
oUQDQgAE6BJAH55JTbnx9Uz8YAZaF1Af1qdgEb2Y8Vcso8rMRG5/56T4sJdFjmYE
42xEhBi4HZlkP/3fd8hOLtw27qBOGw==
-----END EC PRIVATE KEY-----`;

function App() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [backendInstance, setBackendInstance] = useState(point_poc_backend);
  const [principal, setPrincipal] = useState(null);

  const [provider, setProvider] = useState(null);

  const [signature, setSignature] = useState("");

  const [account, setAccount] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    setUserId(account);
  }, [account, isAuthenticated, principal]);

  useEffect(() => {
    setSignature("");
  }, [userId, amount]);

  useEffect(() => {
    if (backendInstance && authClient) {
      backendInstance.getOwner().then((owner) => {
        const principal = authClient.getIdentity().getPrincipal();
        console.log("Authenticated as", principal.toText());
        console.log("Owner is", owner.toText());
        setIsAdmin(principal.toText() === owner.toText());
      });
    } else {
      setIsAdmin(false);
    }
  }, [authClient, backendInstance]);

  const initAuth = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);

    if (await client.isAuthenticated()) {
      setIsAuthenticated(true);
      handleAuthenticated(client);
    } else {
      setIsAuthenticated(false);
    }
  };

  const handleAuthenticated = async (client) => {
    const identity = client.getIdentity();

    setPrincipal(identity.getPrincipal().toText());

    const actor = createActor(canisterId, { agentOptions: { identity } });
    setBackendInstance(actor);
    setIsAuthenticated(true);
  };

  const login = async () => {
    resetData();
    setUserId("");
    setAmount("");
    if (authClient) {
      await new Promise((resolve) => {
        authClient.login({
          onSuccess: resolve,
        });
      });
      handleAuthenticated(authClient);
    }
  };

  const loginAsAdmin = async () => {
    resetData();
    setUserId("");
    setAmount("");
    const identity = Secp256k1KeyIdentity.fromPem(adminPem);

    setPrincipal(identity.getPrincipal().toText());

    const actor = createActor(canisterId, { agentOptions: { identity } });
    setBackendInstance(actor);
    setIsAuthenticated(true);
    setIsAdmin(true);
  };

  const loginAsUser = async () => {
    resetData();
    setUserId("");
    setAmount("");
    const identity = Secp256k1KeyIdentity.fromPem(userPem);

    setPrincipal(identity.getPrincipal().toText());

    const actor = createActor(canisterId, { agentOptions: { identity } });
    setBackendInstance(actor);
    setIsAuthenticated(true);
    setIsAdmin(false);
  };

  const logout = async () => {
    if (authClient) {
      await authClient.logout();
    }
    setBackendInstance(point_poc_backend);
    resetData();
    setAmount("");
    setUserId("");
    setIsAuthenticated(false);
    setPrincipal(null);
    setIsAdmin(false);
  };

  const resetData = () => {
    setMessage("");
    setBalance(null);
  };

  const handleCheckBalance = async (e) => {
    e.preventDefault();
    resetData();
    try {
      const result = await backendInstance.balanceOf(userId);
      setBalance(Number(result));
      setMessage(`Balance for ${userId}: ${Number(result)} points`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleMint = async (e) => {
    e.preventDefault();
    resetData();
    try {
      const result = await backendInstance.mint(userId, BigInt(amount));
      if ("ok" in result) {
        setMessage(`Successfully minted ${amount} points for ${userId}`);
        setAmount("");
      } else {
        setMessage(`Error: ${result.err}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleBurn = async (e) => {
    e.preventDefault();
    resetData();
    try {
      const result = await backendInstance.burn(
        userId,
        BigInt(amount),
        signature
      );
      if ("ok" in result) {
        setMessage(`Successfully burned ${amount} points from ${userId}`);
        setAmount("");
      } else {
        setMessage(`Error: ${result.err}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const connectWallet = async () => {
    try {
      // Web3Modal 인스턴스 생성
      const web3Modal = new Web3Modal({
        network: "mainnet", // 연결할 네트워크를 지정합니다.
        cacheProvider: true, // 이전에 사용한 지갑을 캐시합니다.
      });

      // 지갑 연결
      const instance = await web3Modal.connect();

      // ethers 프로바이더 생성
      const provider = new ethers.providers.Web3Provider(instance);

      setProvider(provider);

      // 계정 설정
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      console.log("지갑이 연결되었습니다:", address);
    } catch (error) {
      console.error("지갑 연결에 실패했습니다:", error);
    }
  };

  const handleSignMessage = async () => {
    if (!provider || !account) {
      console.error("지갑이 연결되지 않았습니다.");
      return;
    }

    const signer = await provider.getSigner();

    const nonce = await point_poc_backend.getBurnNonce(userId);
    const message = await point_poc_backend.makeMessage(
      userId,
      BigInt(amount),
      nonce
    );

    const signature = await signer.signMessage(message);
    const hashedMessage = ethers.utils.hashMessage(message);

    console.log("서명:", signature.slice(2, -2));
    console.log("메세지 해시:", hashedMessage.slice(2));

    setSignature(signature.slice(2, -2));
  };

  return (
    <div className="flex flex-col justify-center min-h-screen py-6 bg-gray-100 sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 transform -skew-y-6 shadow-lg bg-gradient-to-r from-cyan-400 to-light-blue-500 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div>
              <h1 className="mb-6 text-2xl font-semibold text-center">
                ICP Point System
              </h1>

              {!!account ? (
                <div className="text-sm text-center text-gray-500">
                  <p>Connected to {account}</p>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Connect Wallet
                </button>
              )}

              {/** principal */}
              {principal && (
                <div className="text-sm text-center text-gray-500">
                  <p>Authenticated as {principal}</p>
                </div>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-4 space-y-4 text-base leading-6 text-gray-700 sm:text-lg sm:leading-7">
                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <button
                      onClick={login}
                      className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Login with Internet Identity
                    </button>
                    <button
                      onClick={loginAsAdmin}
                      className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Login as Admin
                    </button>
                    <button
                      onClick={loginAsUser}
                      className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-md shadow-sm hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      Login as User
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {isAdmin ? "Logged in as Admin" : "Logged in as User"}
                    </p>
                    <button
                      onClick={logout}
                      className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Logout
                    </button>
                  </div>
                )}
                <form onSubmit={handleCheckBalance} className="space-y-4">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Check Balance
                  </button>
                </form>
                {isAuthenticated && (
                  <div className="space-y-4">
                    <form onSubmit={handleMint} className="space-y-4">
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="User ID"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Mint
                      </button>
                    </form>
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="User ID"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {!signature ? (
                        <button
                          onClick={handleSignMessage}
                          className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          Sign Message
                        </button>
                      ) : (
                        <button
                          type="submit"
                          onClick={handleBurn}
                          className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Burn
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-6 text-base font-bold leading-6 sm:text-lg sm:leading-7">
                {balance !== null && (
                  <p className="text-center">Current Balance: {balance}</p>
                )}
                {message && (
                  <p className="mt-2 text-sm text-center text-gray-600">
                    {message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
