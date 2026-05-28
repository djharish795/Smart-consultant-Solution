"use client";

import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface DownloadButtonProps {
  data: any;
  template: string;
  surveyNumber?: string;
}

export default function DownloadButton({ data, template, surveyNumber }: DownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!data || !template) {
      alert("No data or template available for this report.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          data: data,
          template: template 
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Valuation_Report_${surveyNumber || 'Archive'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        console.error("Failed to generate PDF from archive");
        alert("Failed to generate PDF. Please try again.");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("An error occurred while generating the PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={isGenerating}
      className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all text-white/50 disabled:opacity-50"
      title="Download PDF"
    >
      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
    </button>
  );
}
