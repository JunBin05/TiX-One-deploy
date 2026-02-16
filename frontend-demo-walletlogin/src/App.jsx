import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import VIPEntrance from './components/VIPEntrance';
import MyTicket from './components/MyTicket';
import Scanner from './components/Scanner';
import Marketplace from './components/Marketplace';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/vip" element={<VIPEntrance />} />
                <Route path="/my-ticket" element={<MyTicket />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/marketplace" element={<Marketplace />} />
            </Routes>
        </Router>
    );
}

export default App;