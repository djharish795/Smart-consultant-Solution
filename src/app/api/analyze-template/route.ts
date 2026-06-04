import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateHash, getCachedResult, setCachedResult } from "@/lib/cache-utils";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30 * 60 * 1000, // 30 minutes to allow for massive document generation
    });

    // Extract media type and base64 data correctly from Data URL
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    const mediaType = match ? match[1] : "image/jpeg";
    const base64Data = match ? match[2] : imageUrl;

    // Check if media type is supported by Anthropic
    const supportedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const isPdf = mediaType === "application/pdf";
    const isDocx = mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   mediaType === "application/msword" ||
                   mediaType.includes("wordprocessingml") ||
                   mediaType.includes("docx");
    
    if (!supportedImageTypes.includes(mediaType) && !isPdf && !isDocx) {
      return NextResponse.json({ error: `Unsupported media type: ${mediaType}. Please use JPEG, PNG, PDF, or DOCX.` }, { status: 400 });
    }

    // Check Cache
    const docHash = generateHash(base64Data);
    const cachedResult = getCachedResult(docHash);
    if (cachedResult) {
      console.log(`Cache hit for template hash: ${docHash}`);
      return NextResponse.json(cachedResult);
    }
    console.log(`Cache miss for template hash: ${docHash}, analyzing with Claude...`);

    // Prepare content blocks for Claude
    const contentBlocks: any[] = [];
    
    if (isPdf) {
      contentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Data,
        },
      });
    } else if (isDocx) {
      let extractedText = "";
      try {
        const mammoth = await import("mammoth");
        const buffer = Buffer.from(base64Data, "base64");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (err) {
        console.error("Failed to parse DOCX template:", err);
        return NextResponse.json({ error: "Failed to parse DOCX template file." }, { status: 400 });
      }

      contentBlocks.push({
        type: "text",
        text: `Here is the raw text extracted from the valuation report DOCX template to be reconstructed. Please analyze this layout/branding structure and construct a high-fidelity Tailwind HTML template (with placeholders) matching this: \n\n${extractedText}`
      });
    } else {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as any,
          data: base64Data,
        },
      });
    }

    contentBlocks.push({
      type: "text",
      text: "Analyze this valuation report template structure and build the corresponding high-fidelity Tailwind HTML."
    });

    // This uses Claude Sonnet 4.6 for high-fidelity analysis with better rate limits
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6", 
      max_tokens: 64000, 
      temperature: 0,
      system: [
        {
          type: "text",
          text: `You are a Digital Twin Reconstruction Specialist. Your goal is to convert a reference PDF into a high-fidelity Tailwind HTML template.
      
      Requirements:
      1. Recreate the EXACT layout, branding, colors, and typography using Tailwind CSS. It must look identical to the reference document.
      2. Support ALL pages identified in the document (capable of 6-10+ pages).
      3. Identify ALL data fields in the document and replace them with the format: \${fieldName}.
      4. **Full HTML Document**: The tailwindTemplate MUST be a complete HTML document including <!DOCTYPE html>, <html>, <head>, and <body>.
         - You MUST include the Tailwind CDN in the <head>: <script src="https://cdn.tailwindcss.com"></script>
         - You MUST include <meta charset="utf-8"> in the <head>.
      5. **Tables and Formatting**:
         - For any layout that looks like a table or list of key-value pairs (e.g. schedules, boundaries, measurements), you MUST use proper HTML <table>, <tr>, <th>, and <td> elements.
         - DO NOT use flexbox or grid for tables.
         - Ensure explicit borders are applied where they exist in the original (e.g., class="border border-black px-2 py-1"). If the original has grid lines, you must reproduce them structurally.
         - CRITICAL: STRICTLY REMOVE ANY UNNECESSARY SPACES, MARGINS, OR PADDING BETWEEN TABLES. The output must have a tight, clear structure. Do not add spacing classes like \`mb-4\`, \`mt-8\`, \`my-8\`, or empty \`<br>\` or \`<p>\` tags between tables unless they are absolutely large and explicit in the reference document.
      6. **Efficient DOM Representation**: Do not repeat lengthy class strings on every single element. If a document uses the same table cell style 100 times, insert a <style type="text/tailwindcss"> block in the <head> and define a custom class using @apply. This is CRITICAL for speed and token limits. Use structural HTML wherever possible.
      7. **Elegant PDF Pagination**: 
         - Ensure tables break cleanly between pages.
         - Use 'tr { page-break-inside: avoid; break-inside: avoid; }' to prevent rows from being split.
         - Ensure cells have consistent borders even when split across pages.
         - Do NOT repeat the table header (thead) on multiple pages.
      8. Return a structural JSON object with:
         - tailwindTemplate: A full, complete HTML string (ready for PDF printing).
         - dataSchema: An array of objects [{ name: "fieldName", label: "Field Label", type: "text|number|date", description: "Context" }]
         
      CRITICAL: The dataSchema should ONLY contain fields that require data entry or verification. EXCLUDE:
      - Static labels, legend items, or instructions.
      - "Signature", "Sign here", "Manager Sign", "Place", "Date", "Branch Manager", "ULP Head", "Smart Solutions", or any sign-off/closing fields.
      - Do NOT parameterize (replace with \${fieldName}) any signature, signing place, date of signing, or closing approval blocks. Keep them as static HTML layout with blank underlines (e.g. Place: _________________).
      - Page numbers or header/footer static text.
      
      IMPORTANT: You must output ONLY the JSON object. Do not provide any preamble or commentary. Ensure the JSON is complete and valid.`,
          cache_control: { type: "ephemeral" }
        }
      ] as any,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        }
      ],
      stream: true,
    }, {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      }
    });

    const stream = new ReadableStream({
      async start(controller) {
        let textResponse = "";
        let isClosed = false;
        try {
          for await (const chunk of response) {
            if (isClosed) break;
            if (chunk.type === "content_block_delta" && chunk.delta && "text" in chunk.delta) {
              const text = (chunk.delta as any).text;
              textResponse += text;
              try {
                controller.enqueue(new TextEncoder().encode(text));
              } catch (e) {
                console.warn("Client disconnected during stream transmission.");
                isClosed = true;
                break;
              }
            }
          }

          if (!isClosed) {
            // At the end, try to parse and cache it so subsequent hits are instant
            try {
              let parsedResult;
              const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
              parsedResult = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
              if (parsedResult) {
                setCachedResult(docHash, parsedResult);
              }
            } catch (e) {
              console.error("Failed to parse and cache JSON after stream:", e);
              try {
                const cleaned = textResponse.replace(/```json\n?|\n?```/g, "").trim();
                const parsedResult = JSON.parse(cleaned);
                if (parsedResult) {
                  setCachedResult(docHash, parsedResult);
                }
              } catch (innerE) {}
            }

            try {
              controller.close();
            } catch (e) {}
          }
        } catch (error) {
          console.error("Stream generation error:", error);
          try {
            controller.error(error);
          } catch (e) {}
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Claude Digital Twin error:", error);
    return NextResponse.json({ error: "Failed to reconstruct template" }, { status: 500 });
  }
}
