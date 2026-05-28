import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(req: NextRequest) {
  try {
    const { data, template } = await req.json();

    // The high-fidelity template from Claude analysis, or fallback to a simple one
    const htmlTemplate = template || `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body class="p-8 bg-white text-gray-900">
        <h1 class="text-3xl font-bold text-blue-800 uppercase mb-8">Valuation Report</h1>
        <div class="space-y-4">
          <p><strong>Owner:</strong> ${data.ownerName}</p>
          <p><strong>Survey:</strong> ${data.surveyNumber}</p>
          <p><strong>Value:</strong> ₹${data.finalValue?.toLocaleString() || (parseFloat(data.landValue || 0) + parseFloat(data.buildingValue || 0)).toLocaleString()}</p>
        </div>
      </body>
      </html>`;

    // Perform dynamic substitution if using a custom template
    let finalHtml = htmlTemplate;
    if (template) {
      Object.keys(data).forEach(key => {
        let value = data[key];
        // If the value is placeholder-like (Not Provided, N/A, etc.) or empty/missing, keep it blank for manual signing
        if (value === undefined || value === null || value === "" || 
            /not\s+provided/i.test(String(value)) || 
            /not\s+applicable/i.test(String(value)) || 
            /n\/a/i.test(String(value))) {
          value = "";
        }
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        finalHtml = finalHtml.replace(regex, value);
      });
      
      // Clean up any remaining unsubstituted ${fieldName} placeholders so they don't print raw
      finalHtml = finalHtml.replace(/\$\{[^}]+\}/g, "");
    }

    // Launch headless browser
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
    });

    await browser.close();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Valuation_Report_${data.surveyNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
