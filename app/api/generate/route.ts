export const runtime = "nodejs";

type GenerateRequest = {
  prompt?: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (prompt.length > 400) {
    return Response.json(
      { error: "Prompt must be 400 characters or fewer." },
      { status: 400 },
    );
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing POLLINATIONS_API_KEY." },
      { status: 500 },
    );
  }

  const url = new URL(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`,
  );
  url.searchParams.set("width", "1024");
  url.searchParams.set("height", "1024");
  url.searchParams.set("nologo", "true");
  url.searchParams.set("token", apiKey);

  const imageResponse = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
    },
  });

  if (!imageResponse.ok) {
    const detail = await imageResponse.text();

    return Response.json(
      {
        error: "Image generation failed.",
        detail: detail.slice(0, 400),
      },
      { status: imageResponse.status },
    );
  }

  const contentType = imageResponse.headers.get("content-type") ?? "image/png";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  return Response.json({
    imageUrl: `data:${contentType};base64,${imageBuffer.toString("base64")}`,
  });
}

async function readJsonBody(request: Request): Promise<GenerateRequest> {
  try {
    return (await request.json()) as GenerateRequest;
  } catch {
    return {};
  }
}
