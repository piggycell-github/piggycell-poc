import React, { useState, useEffect } from "react";
import {
  createActor,
  canisterId,
  point_poc_backend,
} from "declarations/point-poc-backend";
import { AuthClient } from "@dfinity/auth-client";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [backendInstance, setBackendInstance] = useState(null);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

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

  function handleMint(event) {
    event.preventDefault();
    const userId = event.target.elements.userId.value;
    const amount = Number(event.target.elements.amount.value);
    point_poc_backend.mint(userId, amount).then((result) => {
      console.log(result);
    });
  }

  return (
    <main>
      <br />
      <br />
      <form action="#" onSubmit={handleMint}>
        <label htmlFor="userId">Enter your name: &nbsp;</label>
        <input id="userId" alt="Name" type="text" />
        <label htmlFor="amount">Enter amount: &nbsp;</label>
        <input id="amount" alt="Amount" type="number" />
        <button type="submit">Mint</button>
      </form>
    </main>
  );
}

export default App;
