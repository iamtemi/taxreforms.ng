import { NextRequest, NextResponse } from "next/server";
import { ai, getTaxStore } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1];

    // Get the File Search Store
    const store = await getTaxStore();

    if (!store.name) {
      throw new Error("Failed to retrieve Store Name");
    }

    // Generate content using the new SDK with File Search tool
    const result = await ai.models.generateContentStream({
      // File Search is supported on Gemini 2.5+ models.
      model: "gemini-2.5-flash",
      contents: [
        ...messages.slice(0, -1).map((m: any) => ({
          role: m.role === "model" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        {
          role: "user",
          parts: [{ text: latestMessage.content }],
        },
      ],
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [store.name],
            },
          },
        ],
      },
    });

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // Iterate result directly
          for await (const chunk of result) {
            const chunkAny = chunk as any;
            const text =
              typeof chunkAny.text === "function"
                ? chunkAny.text()
                : chunkAny.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
