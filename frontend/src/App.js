import './App.css';
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import Home from './pages/Home';
import Navbar from './components/NavBar.js';
function App() {
  return (<div>
    <Navbar/>

    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
      </Routes>
    
    </BrowserRouter>
    </div>
  );
}

export default App;
