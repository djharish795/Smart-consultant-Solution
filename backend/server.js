import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';
import { chromium } from 'playwright';
import { generateHash, getCachedResult, setCachedResult } from './cache-utils.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const port = process.env.PORT || 3001;

// Supabase client helper
function getSupabaseClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}

// Auth Middleware
async function authenticate(req, res, next) {
  try {
    const supabase = getSupabaseClient(req);
    if (!supabase) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
    }

    req.user = user;
    req.supabase = supabase;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ error: 'Unauthorized: Auth failed' });
  }
}

// 1. POST /api/analyze-template
app.post('/api/analyze-template', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30 * 60 * 1000,
    });

    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    const mediaType = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : imageUrl;

    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const isPdf = mediaType === 'application/pdf';
    const isDocx = mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mediaType === 'application/msword' ||
      mediaType.includes('wordprocessingml') ||
      mediaType.includes('docx');

    if (!supportedImageTypes.includes(mediaType) && !isPdf && !isDocx) {
      return res.status(400).json({ error: `Unsupported media type: ${mediaType}.` });
    }

    const docHash = generateHash(base64Data);
    const cachedResult = getCachedResult(docHash);
    if (cachedResult) {
      console.log(`Cache hit for hash: ${docHash}`);
      return res.json(cachedResult);
    }
    console.log(`Cache miss for hash: ${docHash}, analyzing...`);

    const contentBlocks = [];

    if (isPdf) {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      });
    } else if (isDocx) {
      let extractedText = '';
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (err) {
        console.error('Failed to parse DOCX:', err);
        return res.status(400).json({ error: 'Failed to parse DOCX template file.' });
      }

      contentBlocks.push({
        type: 'text',
        text: `Here is the raw text extracted from the valuation report DOCX template to be reconstructed: \n\n${extractedText}`
      });
    } else {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: 'Analyze this valuation report template structure and build the corresponding high-fidelity Tailwind HTML.'
    });

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 64000,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: `You are a Digital Twin Reconstruction Specialist. Your goal is to convert a reference PDF/image/document into a high-fidelity Tailwind HTML template.
      
      Requirements:
      1. **Exact Layout Alignment & Continuous Flow**: Recreate the EXACT layout, branding, colors, lines, and typography using Tailwind CSS. The output must look identical to the reference document.
         - CRITICAL: DO NOT use absolute positioning for positioning tables or layout blocks. They MUST flow in a standard, natural document flow.
         - CRITICAL: DO NOT wrap pages or sections in fixed-height containers like 'h-screen', 'min-h-screen', 'h-[297mm]', or 'h-[1123px]'. PDF renderers (like Playwright) automatically paginate based on content height; fixed heights stretch elements unnaturally, causing massive blank gaps and incorrect pagination.
      2. Support ALL pages identified in the document (capable of 6-10+ pages).
      3. Identify ALL data fields in the document and replace them with the placeholder format: \${fieldName}.
      4. **Full HTML Document**: The tailwindTemplate MUST be a complete HTML document including <!DOCTYPE html>, <html>, <head>, and <body>.
         - You MUST include the Tailwind CDN in the <head>: <script src="https://cdn.tailwindcss.com"></script>
         - You MUST include <meta charset="utf-8"> in the <head>.
      5. **Tables and Formatting (Strict Cell Boundaries & No Overflow)**:
         - For any layout that looks like a table or list of key-value pairs (e.g. schedules, boundaries, measurements), you MUST use proper HTML <table>, <tr>, <th>, and <td> elements.
         - DO NOT use flexbox or grid for tables.
         - Ensure explicit borders are applied where they exist in the original (e.g., class="border border-black px-2 py-1"). If the original has grid lines, you must reproduce them structurally.
         - CRITICAL: Prevent text overflow and overlapping. All table cells containing fields (\${fieldName}) MUST have CSS properties or Tailwind classes to wrap text and prevent breaking layout: 'break-words', 'whitespace-pre-wrap', and 'word-break: break-word;'.
         - Avoid fixed height constraints (e.g., 'h-8' or 'h-10') on table cells/rows containing dynamic fields. Let cells grow dynamically in height or use minimum heights ('min-h-*') so long text values don't overflow or clip.
         - CRITICAL: STRICTLY REMOVE ANY UNNECESSARY SPACES, MARGINS, OR PADDING BETWEEN TABLES. The output must have a tight, clear structure. Do not add spacing classes like \`mb-4\`, \`mt-8\`, \`my-8\`, or empty \`<br>\` or \`<p>\` tags between tables unless they are absolutely large and explicit in the reference document.
      6. **Style Tag Injecting (Mandatory)**:
         You MUST inject the following CSS rules inside a <style> block in the <head> to guarantee correct printing alignment:
         <style>
           table {
             width: 100% !important;
             border-collapse: collapse !important;
           }
           tr {
             page-break-inside: avoid !important;
             break-inside: avoid !important;
           }
           td, th {
             border: 1px solid black !important;
             vertical-align: top !important;
             word-wrap: break-word !important;
             overflow-wrap: break-word !important;
           }
         </style>
      7. **Efficient DOM Representation**: Do not repeat lengthy class strings on every single element. If a document uses the same table cell style 100 times, insert a <style type="text/tailwindcss"> block in the <head> and define a custom class using @apply. This is CRITICAL for speed and token limits. Use structural HTML wherever possible.
      8. **Elegant PDF Pagination**: 
         - Ensure tables break cleanly between pages.
         - Ensure cells have consistent borders even when split across pages.
         - Do NOT repeat the table header (thead) on multiple pages.
         - Only insert page breaks (e.g. '<div style="page-break-after: always; break-after: page;"></div>') where the reference template explicitly has a physical page divide.
      9. Return a structural JSON object with:
         - tailwindTemplate: A full, complete HTML string (ready for PDF printing).
         - dataSchema: An array of objects [{ name: "fieldName", label: "Field Label", type: "text|number|date", description: "Context" }] (NO page, x, y coordinates allowed)
         
      CRITICAL: Every placeholder inside the tailwindTemplate (e.g. \${fieldName}) MUST have a corresponding object in the dataSchema with name: "fieldName" (matching EXACTLY in casing, letters, spelling, and containing no spaces). Do not parameterize items that are not in the schema, and do not put items in the schema that are not represented by placeholders in the HTML.
         
      CRITICAL: The dataSchema should ONLY contain fields that require data entry or verification. EXCLUDE:
      - Static labels, legend items, or instructions.
      - "Signature", "Sign here", "Manager Sign", "Place", "Date", "Branch Manager", "ULP Head", "Smart Solutions", or any sign-off/closing fields.
      - Do NOT parameterize (replace with \${fieldName}) any signature, signing place, date of signing, or closing approval blocks. Keep them as static HTML layout with blank underlines (e.g. Place: _________________).
      - Page numbers or header/footer static text.
      
      IMPORTANT: You must output ONLY the JSON object. Do not provide any preamble or commentary. Ensure the JSON is complete and valid.`,
          cache_control: { type: 'ephemeral' }
        }
      ]
    });

    const textResponse = response.content[0].text;
    let parsedResult;
    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      parsedResult = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
      if (parsedResult) {
        setCachedResult(docHash, parsedResult);
      }
    } catch (e) {
      console.error('Failed to parse Claude output:', e);
      try {
        const cleaned = textResponse.replace(/```json\n?|\n?```/g, '').trim();
        parsedResult = JSON.parse(cleaned);
        if (parsedResult) {
          setCachedResult(docHash, parsedResult);
        }
      } catch (innerE) {
        return res.status(500).json({ error: 'Failed to parse reconstructed HTML from AI response.' });
      }
    }

    return res.json(parsedResult);
  } catch (error) {
    console.error('Claude Digital Twin error:', error);
    return res.status(500).json({ error: 'Failed to reconstruct template', details: error.message || String(error) });
  }
});

// 2. POST /api/extract-data
app.post('/api/extract-data', authenticate, async (req, res) => {
  try {
    const { text, pdfUrl, schema, template } = req.body;

    if (!text && !pdfUrl) {
      return res.status(400).json({ error: 'No text or PDF provided' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30 * 60 * 1000,
    });

    const supabase = req.supabase;
    const user = req.user;

    // Credit Check
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits < 1) {
      return res.status(403).json({ error: 'Insufficient credits. Please upgrade your plan.' });
    }

    const contentBlocks = [];
    
    if (pdfUrl) {
      const match = pdfUrl.match(/^data:([^;]+);base64,(.+)$/);
      const mediaType = match ? match[1] : 'application/pdf';
      const base64Data = match ? match[2] : pdfUrl;

      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const isPdf = mediaType === 'application/pdf';
      const isDocx = mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                     mediaType === 'application/msword' ||
                     mediaType.includes('wordprocessingml') ||
                     mediaType.includes('docx');

      if (isPdf) {
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        });
      } else if (supportedImageTypes.includes(mediaType)) {
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        });
      } else if (isDocx) {
        let extractedText = '';
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } catch (err) {
          console.error('Failed to parse DOCX:', err);
          return res.status(400).json({ error: 'Failed to parse DOCX document.' });
        }

        contentBlocks.push({
          type: 'text',
          text: `Here is the raw text extracted from the DOCX application document: \n\n${extractedText}`
        });
      } else {
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        });
      }
    }

    if (text) {
      contentBlocks.push({
        type: 'text',
        text: `Extract details from this text: \n\n${text}`
      });
    } else {
      contentBlocks.push({
        type: 'text',
        text: 'Extract details from the provided document based on the requirements.'
      });
    }

    const schemaInstruction = schema && schema.length > 0
      ? `Extract values for the following fields: ${JSON.stringify(schema.map(f => ({ name: f.name, label: f.label, type: f.type, description: f.description })))}`
      : 'Extract all relevant fields, names, dates, amounts, and identifiers found in the document.';

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 64000,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: `You are a Senior Banking Documentation Officer with 20+ years of experience preparing verification reports, KYC reports, employment verification reports, valuation reports, and loan processing documents.

Your Goals:
1. EXACT DETAIL EXTRACTION: Extract values for the fields requested in the schema from the provided document. Do not summarize or omit important details.
2. Ensure all fields required by this schema are present: ${schemaInstruction}.
3. DOCUMENT PRESERVATION & CONCISENESS RULES:
   - Only provide the value that belongs inside each field.
   - Keep answers concise. Use the shortest professional value that satisfies the field.
   - Prefer short answers and numbers where applicable. This prevents text overflow in tiny table cells.
   - Every value must fit naturally inside a banking/valuation verification cell without requiring table expansion. Never generate paragraphs or explanatory sentences where a short value is sufficient.
   - Output short banking values only. Examples of cell output formats:
     * PAN Match -> MATCHED
     * Gender Match -> YES
     * Verification Status -> VERIFIED
     * Final Result -> POSITIVE

Output a strict JSON object containing ONLY the extracted fields. Do NOT include any "reasoning" key, explanation, or extra text. Output ONLY the raw JSON object conforming exactly to the schema.`,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: contentBlocks,
        }
      ],
    });

    const textResponse = response.content[0].text;
    let extractedData = null;

    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
    } catch (e) {
      try {
        const cleaned = textResponse.replace(/```json\n?|\n?```/g, '').trim();
        extractedData = JSON.parse(cleaned);
      } catch (innerE) {
        return res.status(500).json({ error: 'Failed to parse extracted data from Claude.' });
      }
    }

    if (!extractedData) {
      return res.status(500).json({ error: 'Extracted data is null' });
    }

    const toUpperCaseRecursively = (obj) => {
      if (typeof obj === 'string') return obj.toUpperCase();
      if (Array.isArray(obj)) return obj.map(toUpperCaseRecursively);
      if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
          newObj[key] = toUpperCaseRecursively(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    extractedData = toUpperCaseRecursively(extractedData);

    try {
      const usage = response.usage;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;
      const exactCost = (inputTokens * 3.0 / 1000000) + (outputTokens * 15.0 / 1000000);

      await supabase.from('reports').insert({
        user_id: user.id,
        owner_name: extractedData.ownerName || extractedData.applicantName || extractedData.customerName || 'Unknown Owner',
        location: extractedData.propertyAddress || extractedData.location || extractedData.address || 'N/A',
        valuation_sum: extractedData.distressValue || extractedData.marketValue || extractedData.loanAmount || extractedData.valuationAmount || 'N/A',
        status: 'Verified',
        data: { 
          ...extractedData, 
          _schema: schema,
          _billing: { cost: exactCost, input_tokens: inputTokens, output_tokens: outputTokens } 
        },
        template: template
      });

      await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);
    } catch (dbError) {
      console.error('Failed to update Supabase record:', dbError);
    }

    return res.json(extractedData);
  } catch (error) {
    console.error('Claude extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract data' });
  }
});

// 3. POST /api/generate-report
app.post('/api/generate-report', async (req, res) => {
  try {
    const { data = {}, template } = req.body;
    const safeData = data || {};

    if (!template) {
      return res.status(400).json({ error: 'No template provided' });
    }

    console.log('Generating PDF via Playwright...');
    let finalHtml = template;

    const normalizeKey = (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedData = {};
    Object.keys(safeData).forEach(key => {
      const norm = normalizeKey(key);
      if (norm) {
        normalizedData[norm] = String(safeData[key] !== undefined && safeData[key] !== null ? safeData[key] : '');
      }
    });

    const placeholderRegex = /\$\{([^}]+)\}/g;
    let match;
    const replacements = {};
    placeholderRegex.lastIndex = 0;
    while ((match = placeholderRegex.exec(finalHtml)) !== null) {
      const rawPlaceholder = match[0];
      const fieldName = match[1];
      if (safeData[fieldName] !== undefined && safeData[fieldName] !== null) {
        replacements[rawPlaceholder] = String(safeData[fieldName]);
      } else {
        const normFieldName = normalizeKey(fieldName);
        if (normalizedData[normFieldName] !== undefined) {
          replacements[rawPlaceholder] = normalizedData[normFieldName];
        } else {
          replacements[rawPlaceholder] = '';
        }
      }
    }

    Object.keys(replacements).forEach(placeholder => {
      finalHtml = finalHtml.replaceAll(placeholder, replacements[placeholder]);
    });
    finalHtml = finalHtml.replace(/\$\{[^}]+\}/g, '');

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Application_Report_${safeData.applicantName || safeData.ownerName || 'Final'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ error: 'Failed to generate PDF', details: error.message || String(error) });
  }
});

app.listen(port, () => {
  console.log(`Smart Consultant Backend listening on port ${port}`);
});
