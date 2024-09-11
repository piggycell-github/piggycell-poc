import { point_poc_backend } from "declarations/point-poc-backend";

function App() {
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
