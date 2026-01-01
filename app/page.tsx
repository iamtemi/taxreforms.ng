import ChatInterface from "./components/ChatInterface";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black font-sans">
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white">
              NG
            </div>
            <h1 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              Tax Reform Assistant
            </h1>
          </div>
          <div className="text-xs text-zinc-500">MVP v1.0</div>
        </div>
      </header>

      <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 flex flex-col">
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300 mb-6">
          <p className="font-medium mb-1">Welcome</p>
          <p>
            I have access to the Business Facilitation Act, CAMA 2020, and other
            key Nigerian tax laws. Ask me anything.
          </p>
        </div>

        <section className="flex-1 min-h-[500px] h-[calc(100vh-220px)]">
          <ChatInterface />
        </section>
      </div>
    </main>
  );
}
