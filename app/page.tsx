"use client";

import { useState } from "react";
import ChatInterface from "./components/ChatInterface";

export default function Home() {
  const [hasUserMessage, setHasUserMessage] = useState(false);

  return (
    <main className="flex overflow-hidden h-screen flex-col bg-zinc-50 dark:bg-black font-sans">
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center font-bold text-white">
              NG
            </div>
            <h1 className="font-semibold text-normal md:text-lg">
              My Tax Reform Assistant
            </h1>
          </div>
          <div className="text-xs text-zinc-500">MVP v0.2</div>
        </div>
      </header>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 flex flex-col min-h-0">
        {!hasUserMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded text-sm text-blue-800 dark:text-blue-300 mb-6">
            <p>
              <span className="font-bold">Welcome,</span> I have access to the
              Business Facilitation Act, CAMA 2020, 2025 Tax Reforms and other
              key Nigerian tax laws. Ask me anything.
            </p>
          </div>
        )}

        <section className="flex-1 min-h-0 flex flex-col">
          <ChatInterface onFirstMessage={() => setHasUserMessage(true)} />
        </section>
      </div>
    </main>
  );
}
