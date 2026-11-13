import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(req: NextRequest) {
  try {
    const { data = {}, template } = await req.json();
    const safeData = data || {};

    if (!template) {
      return NextResponse.json({ error: "No template provided" }, { status: 400 });
    }

    console.log("Generating PDF from reconstructed HTML template...");
    let finalHtml = template;

    // Normalize and replace placeholders like ${fieldName}
    const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedData: Record<string, string> = {};
    Object.keys(safeData).forEach(key => {
      const norm = normalizeKey(key);
      if (norm) {
        normalizedData[norm] = String(safeData[key] !== undefined && safeData[key] !== null ? safeData[key] : "");
      }
    });

    const placeholderRegex = /\$\{([^}]+)\}/g;
    let match;
    const replacements: Record<string, string> = {};
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
          replacements[rawPlaceholder] = "";
        }
      }
    }

    Object.keys(replacements).forEach(placeholder => {
      finalHtml = finalHtml.replaceAll(placeholder, replacements[placeholder]);
    });
    // Remove any remaining unresolved placeholders
    finalHtml = finalHtml.replace(/\$\{[^}]+\}/g, "");

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle" });

    const pdfOptions: any = {
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "20mm",
        right: "20mm"
      }
    };

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Application_Report_${safeData.applicantName || safeData.ownerName || 'Final'}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("PDF generation error details:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message || String(error) }, { status: 500 });
  }
}
