import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { text, pdfUrl, schema, baseRates, template } = await req.json();

    if (!text && !pdfUrl) {
      return NextResponse.json({ error: "No text or PDF provided" }, { status: 400 });
    }

    console.log("DEBUG: ANTHROPIC_API_KEY from process.env:", JSON.stringify(process.env.ANTHROPIC_API_KEY));

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30 * 60 * 1000, // 30 minutes to allow for massive document extraction
    });

    // Credit Check
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits < 1) {
      return NextResponse.json({ error: "Insufficient credits. Please upgrade your plan." }, { status: 403 });
    }

    const contentBlocks: any[] = [];
    
    if (pdfUrl) {
      const match = pdfUrl.match(/^data:([^;]+);base64,(.+)$/);
      const mediaType = match ? match[1] : "application/pdf";
      const base64Data = match ? match[2] : pdfUrl;

      const supportedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const isPdf = mediaType === "application/pdf";
      const isDocx = mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                     mediaType === "application/msword" ||
                     mediaType.includes("wordprocessingml") ||
                     mediaType.includes("docx");

      if (isPdf) {
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        });
      } else if (supportedImageTypes.includes(mediaType)) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as any,
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
          console.error("Failed to parse DOCX deed:", err);
          return NextResponse.json({ error: "Failed to parse DOCX document." }, { status: 400 });
        }

        contentBlocks.push({
          type: "text",
          text: `Here is the raw text extracted from the Legal Sale Deed DOCX document: \n\n${extractedText}`
        });
      } else {
        console.warn(`Unknown media type in extract-data: ${mediaType}, attempting PDF fallback`);
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        });
      }
    }

    if (text) {
      contentBlocks.push({
        type: "text",
        text: `Extract details from this text: \n\n${text}`
      });
    } else {
      contentBlocks.push({
        type: "text",
        text: "Extract property details from the provided document based on the requirements."
      });
    }

    const coreFields = ["ownerName", "surveyNumber", "propertyAddress", "marketValue", "distressValue"];
    let finalSchema = schema ? [...schema] : [];
    
    // Ensure core fields are present in schema for UI binding
    coreFields.forEach(field => {
      if (schema && !schema.some((f: any) => f.name === field)) {
        finalSchema.push({ 
          name: field, 
          label: field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 
          type: "text" 
        });
      }
    });

    const schemaInstruction = finalSchema.length > 0
      ? `Extract and calculate the following fields: ${JSON.stringify(finalSchema)}`
      : "Extract/Calculate: ownerName, surveyNumber, propertyAddress, propertyType, landValue, buildingValue, yearsAfterConstruction, marketValue, distressValue.";

    const baseRateContext = baseRates 
      ? `CONTEXT: The user has provided the following base rates:
         - Market Rate: ${baseRates.marketRate} per sq unit
         - Government Rate: ${baseRates.governmentRate} per sq unit
         Use these rates to calculate total values (Total Value = Area * Rate) even if not mentioned in the deed.
         If the deed has different values, prioritize the provided base rates for consistent valuation.`
      : "";

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      max_tokens: 64000, // Increased from 8000 to prevent truncation on large deeds
      temperature: 0,
      system: [
        {
          type: "text",
          text: `You are a Senior Financial Valuation Expert and Data Extraction Specialist.
      
      Your Goals:
      1. EXACT DETAIL EXTRACTION: Extract *every single relevant detail* from the provided document (Telugu -> English). Do not summarize or omit any dimensions, boundaries, schedules, clauses, or property specifications. The user needs 100% data replication in the final report.
      2. Perform Automated Financial Math: ${baseRateContext}
      3. Calculate derived values:
         - Land Value = Area * Market Rate.
         - Reconstruction Cost = Standard rate for the property type * Area.
         - Depreciation = (Age / Total Life) * 0.9 * Reconstruction Cost.
         - Final Fair Market Value = Land Value + (Reconstruction Cost - Depreciation).
         - Distress Value = 85% of FMV.
      4. Ensure all fields required by this schema are present: ${schemaInstruction}. Add any additional fields if interesting details are found in the deed.
      
      Output a strict JSON object with all fields and a "reasoning" key explaining your math step-by-step.`,
          cache_control: { type: "ephemeral" }
        }
      ] as any,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        }
      ],
    }, {
      headers: {
        "anthropic-beta": "prompt-caching-2024-07-31"
      }
    });

    if (response.stop_reason === "max_tokens") {
      throw new Error("Claude output was truncated due to token limits. Please try a simpler extraction or increase max_tokens further.");
    }

    const content = response.content[0];
    if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
    }
    
    // Robust JSON extraction
    const textResponse = content.text;
    let extractedData = null;

    try {
      // Try to find the largest JSON block
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to parse the entire text if no braces found (rare)
        extractedData = JSON.parse(textResponse);
      }
    } catch (e) {
      console.error("Initial JSON parse failed. Response text:", textResponse);
      // Attempt to fix common issues: removing markdown blocks
      try {
        const cleaned = textResponse.replace(/```json\n?|\n?```/g, "").trim();
        extractedData = JSON.parse(cleaned);
      } catch (innerE) {
        throw new Error("Failed to parse extracted data from Claude after cleaning.");
      }
    }

    if (!extractedData) {
      throw new Error("Extracted data is null");
    }

    // Convert all string values to upper case as requested by the client
    const toUpperCaseRecursively = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.toUpperCase();
      }
      if (Array.isArray(obj)) {
        return obj.map(toUpperCaseRecursively);
      }
      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = toUpperCaseRecursively(obj[key]);
        }
        return newObj;
      }
      return obj;
    }

    extractedData = toUpperCaseRecursively(extractedData);

    // Save to Supabase Archive & Deduct Credits
    try {
      if (user) {
        // Calculate exact Anthropic cost (Claude 4.6 Sonnet pricing)
        const usage = response.usage;
        const inputTokens = usage?.input_tokens || 0;
        const outputTokens = usage?.output_tokens || 0;
        const exactCost = (inputTokens * 3.0 / 1000000) + (outputTokens * 15.0 / 1000000);

        // Save report
        await supabase.from('reports').insert({
          user_id: user.id,
          owner_name: extractedData.ownerName || "Unknown Owner",
          location: extractedData.propertyAddress || extractedData.location || "N/A",
          valuation_sum: extractedData.distressValue || extractedData.marketValue || "N/A",
          status: "Verified",
          data: { ...extractedData, _billing: { cost: exactCost, input_tokens: inputTokens, output_tokens: outputTokens } },
          template: template
        });

        // Deduct 1 credit
        await supabase
          .from('profiles')
          .update({ credits: profile.credits - 1 })
          .eq('id', user.id);
      }
    } catch (dbError) {
      console.error("Failed to update credits or save report:", dbError);
    }

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error("Claude extraction error:", error);
    return NextResponse.json({ error: "Failed to extract data" }, { status: 500 });
  }
}
