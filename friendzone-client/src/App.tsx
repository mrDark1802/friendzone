import { useState } from 'react'
import './App.css'

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-3xl font-bold text-slate-800">
          FriendZone 💬
        </h1>

        <p className="mt-3 text-slate-600">
          Real-Time Chat Application
        </p>

        <button className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700">
          Get Started
        </button>
      </div>
    </div>
  );
}

export default App;
