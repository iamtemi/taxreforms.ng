import { NextRequest, NextResponse } from "next/server";
import { getAI, getTaxStore } from "@/lib/gemini";

// Rate limiting configuration
const RATE_LIMIT = (() => {
  const parsed = Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE || "10", 10);
  return Number.isFinite(parsed) ? parsed : 10;
})();
const RATE_WINDOW = 60000; // 1 minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let lastRateLimitPruneAt = 0;

// Payload validation limits
const MAX_BODY_SIZE = (() => {
  const parsed = Number.parseInt(process.env.MAX_REQUEST_SIZE_KB || "100", 10);
  return (Number.isFinite(parsed) ? parsed : 100) * 1024;
})(); // Default 100KB
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 50;

type ChatMessage = {
  role: "user" | "model";
  content: string;
};

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  if (now - lastRateLimitPruneAt > RATE_WINDOW) {
    lastRateLimitPruneAt = now;
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

function parseMessages(
  messages: unknown
): { ok: true; messages: ChatMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(messages)) {
    return { ok: false, error: "Messages must be an array" };
  }

  if (messages.length === 0) {
    return { ok: false, error: "Messages array cannot be empty" };
  }

  if (messages.length > MAX_MESSAGES) {
    return {
      ok: false,
      error: `Too many messages. Maximum ${MAX_MESSAGES} messages allowed.`,
    };
  }

  const parsed: ChatMessage[] = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      return { ok: false, error: "Each message must be an object" };
    }

    const record = msg as Record<string, unknown>;
    const role = record.role;
    const content = record.content;

    if (role !== "user" && role !== "model") {
      return {
        ok: false,
        error: 'Each message role must be "user" or "model"',
      };
    }

    if (!content || typeof content !== "string") {
      return {
        ok: false,
        error: "Each message must have a string content field",
      };
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        ok: false,
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters per message.`,
      };
    }

    parsed.push({ role, content });
  }

  return { ok: true, messages: parsed };
}

const SYSTEM_INSTRUCTION = `You are a specialized Nigerian Tax Law and Business Regulation Assistant. Your role is STRICTLY LIMITED to providing information from the provided legal documents.

CRITICAL RULES - YOU MUST FOLLOW THESE:

1. SCOPE RESTRICTION:
   - ONLY answer questions about Nigerian tax laws, business regulations, and compliance matters
   - You have access to: Business Facilitation Act 2022, CAMA 2020, Nigeria Tax Act 2025, Nigeria Tax Administration Act 2025, Employee Compensation Act 2010, Pension Reform Act 2014, Industrial Trust Fund Act, Joint Revenue Board Establishment Act, and Nigeria Revenue Service Establishment Act
   - If a question is NOT related to Nigerian tax laws or business regulations, you MUST refuse to answer

2. INFORMATION SOURCING:
   - ONLY use information from the documents in the File Search store
   - NEVER use information from your training data that is not in the provided documents
   - If information is not found in the documents, explicitly state: "I don't have that information in my knowledge base. I can only provide information from the Nigerian tax and business law documents I have access to."

3. DOCUMENT PRIORITIZATION:
   - Prioritize information from the most recent documents (2025 Tax Reforms, Nigeria Tax Act 2025, Nigeria Tax Administration Act 2025)
   - When providing tax rates, calculations, or legal provisions, ALWAYS confirm the applicable tax year; if the user did not provide a year, ask a clarifying question before calculating
   - Always cite the specific document and year for any rate, threshold, or formula you use
   - Example: "According to the Nigeria Tax Act 2025, Section X..."

4. REFUSAL PROTOCOL:
   - For questions outside your scope (general knowledge, other countries' laws, unrelated topics), respond with: "I'm a specialized assistant for Nigerian tax laws and business regulations only. I cannot answer questions outside this scope. Please ask me about Nigerian tax laws, business regulations, or compliance matters."
   - For questions about Nigerian tax laws where information is not in your documents, say: "I don't have that specific information in my knowledge base. I can only provide information from the documents I have access to."

5. ACCURACY REQUIREMENTS:
   - Always specify the year/version of the law you're referencing
   - If you find conflicting information between documents, mention both and indicate which is more recent
   - Never guess or infer information not explicitly stated in the documents

Remember: You are NOT a general-purpose chatbot. You are a specialized assistant for Nigerian tax and business law only.`;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(req);
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT",
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitCheck.retryAfter),
          },
        }
      );
    }

    // Read and validate request body size
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        {
          error: "Content-Type must be application/json",
          code: "INVALID_CONTENT_TYPE",
        },
        { status: 400 }
      );
    }

    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
        return NextResponse.json(
          {
            error: `Request body too large. Maximum ${
              MAX_BODY_SIZE / 1024
            }KB allowed.`,
            code: "PAYLOAD_TOO_LARGE",
          },
          { status: 413 }
        );
      }
    }

    const body = await req.text();
    const bodySizeBytes = new TextEncoder().encode(body).length;
    if (bodySizeBytes > MAX_BODY_SIZE) {
      return NextResponse.json(
        {
          error: `Request body too large. Maximum ${
            MAX_BODY_SIZE / 1024
          }KB allowed.`,
          code: "PAYLOAD_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    let messages: unknown;
    try {
      messages = JSON.parse(body).messages;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    // Validate payload structure and content
    const parsedMessages = parseMessages(messages);
    if (!parsedMessages.ok) {
      return NextResponse.json(
        { error: parsedMessages.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const messagesArray = parsedMessages.messages;
    const latestMessage = messagesArray[messagesArray.length - 1];
    if (!latestMessage || !latestMessage.content) {
      return NextResponse.json(
        { error: "Latest message is required", code: "MISSING_MESSAGE" },
        { status: 400 }
      );
    }

    // Get the File Search Store
    const ai = getAI();
    if (!ai) {
      return NextResponse.json(
        {
          error: "Service configuration error. Please contact support.",
          code: "API_KEY_MISSING",
        },
        { status: 503 }
      );
    }

    const store = await getTaxStore();
    if (!store.name) {
      return NextResponse.json(
        {
          error: "Failed to retrieve knowledge base. Please try again later.",
          code: "STORE_ERROR",
        },
        { status: 500 }
      );
    }

    // Generate content using the new SDK with File Search tool
    const result = await ai.models.generateContentStream({
      // File Search is supported on Gemini 2.5+ models.
      model: "gemini-2.5-flash",
      contents: [
        ...messagesArray.slice(0, -1).map((m) => ({
          role: m.role === "model" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        {
          role: "user",
          parts: [{ text: latestMessage.content }],
        },
      ],
      config: {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
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
            const chunkWithText = chunk as { text?: unknown };
            const text =
              typeof chunkWithText.text === "function"
                ? (chunkWithText.text as () => string)()
                : typeof chunkWithText.text === "string"
                  ? chunkWithText.text
                  : undefined;
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
  } catch (error: unknown) {
    console.error("Chat error:", error);

    const err = error as { status?: unknown; message?: unknown };
    const status =
      typeof err?.status === "number" ? (err.status as number) : undefined;
    const message = typeof err?.message === "string" ? err.message : "";

    // Handle specific API errors
    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          error: "Authentication failed. Service may be misconfigured.",
          code: "AUTH_ERROR",
        },
        { status: 503 }
      );
    }

    if (status === 429) {
      return NextResponse.json(
        {
          error: "API rate limit exceeded. Please try again later.",
          code: "API_RATE_LIMIT",
        },
        { status: 503 }
      );
    }

    if (
      status === 402 ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("billing")
    ) {
      return NextResponse.json(
        {
          error: "Service quota exhausted. Please try again later.",
          code: "BUDGET_EXHAUSTED",
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      {
        error:
          "An error occurred while processing your request. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
