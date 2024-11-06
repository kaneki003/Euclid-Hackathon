import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Navbar from "./components/NavBar.jsx";
import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
function App() {
  const [network, setNetwork] = useState(null);
  const [Token, settoken] = useState(null);
  const [Address, setAddress] = useState(null);
  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Navbar
        Token={Token}
        settoken={settoken}
        network={network}
        setNetwork={setNetwork}
        Address={Address}
        setAddress={setAddress}
      />

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
