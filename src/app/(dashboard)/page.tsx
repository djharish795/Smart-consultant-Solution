"use client";

import React, { useState } from "react";
import ValuationForm from "@/components/ValuationForm";
import FileUploader from "@/components/FileUploader";
import { Sparkles, ArrowRight, LayoutDashboard, FileCheck, FileOutput, Calculator, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [step, setStep] = useState(1);
  const [templateStatus, setTemplateStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [deedStatus, setDeedStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "processing" | "completed">("idle");
  const [loadingText, setLoadingText] = useState("");
  const [streamText, setStreamText] = useState("");

  const [extractedData, setExtractedData] = useState<any>(null);
  const [tailwindTemplate, setTailwindTemplate] = useState<string>("");
  const [dataSchema, setDataSchema] = useState<any[]>([]);

  const [deedBase64, setDeedBase64] = useState<string>("");
  const [deedFileName, setDeedFileName] = useState<string>("");
  const [extractionError, setExtractionError] = useState<string>("");

  const handleTemplateUpload = async (file: File) => {
    setTemplateStatus("uploading");
    setStreamText("");
    setLoadingText("Initializing Digital Twin Reconstruction...");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        setLoadingText("Analyzing Page Layouts & Branding...");
        const base64 = reader.result as string;
        const response = await fetch("/api/analyze-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: base64, fileName: file.name }),
        });
        
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            setLoadingText("Synthesizing Custom Tailwind Schema...");
            const { tailwindTemplate, dataSchema } = await response.json();
            setTailwindTemplate(tailwindTemplate);
            setDataSchema(dataSchema);
            setTemplateStatus("completed");
            setTimeout(() => setStep(2), 1000);
          } else {
            setLoadingText("Streaming Digital Twin Generation...");
            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");
            let rawText = "";

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                rawText += chunk;
                // Only show the last 2000 characters to prevent browser lag during massive generation
                setStreamText(rawText.slice(-2000));
              }
            } else {
              rawText = await response.text();
              setStreamText(rawText.slice(-2000));
            }

            try {
              const jsonMatch = rawText.match(/\{[\s\S]*\}/);
              const parsedResult = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
              setTailwindTemplate(parsedResult.tailwindTemplate);
              setDataSchema(parsedResult.dataSchema);
              setTemplateStatus("completed");
              setTimeout(() => setStep(2), 1000);
            } catch (e) {
              try {
                const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
                const parsedResult = JSON.parse(cleaned);
                setTailwindTemplate(parsedResult.tailwindTemplate);
                setDataSchema(parsedResult.dataSchema);
                setTemplateStatus("completed");
                setTimeout(() => setStep(2), 1000);
              } catch (innerE) {
                console.error("Failed to parse streamed text", innerE);
                setTemplateStatus("idle");
              }
            }
          }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("Template analysis failed:", errorData.error || response.statusText);
            setTemplateStatus("idle");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading template:", error);
      setTemplateStatus("idle");
    }
  };

  const handleDeedUpload = async (file: File) => {
    setExtractionError("");
    if (file.size > 3.2 * 1024 * 1024) {
      alert("File is " + (file.size / (1024 * 1024)).toFixed(1) + "MB. Vercel serverless has a strict 4.5MB request payload limit (including base64 encoding). Please upload a document under 3.2MB or compress it.");
      setDeedStatus("idle");
      return;
    }
    setDeedStatus("uploading");
    setLoadingText("Acquiring Legal Sale Deed...");
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setDeedBase64(base64Data);
      setDeedFileName(file.name);
      setDeedStatus("completed");
      handleStartExtraction(base64Data, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleStartExtraction = async (uploadedDeedBase64?: string, uploadedFileName?: string) => {
    const deedData = uploadedDeedBase64 || deedBase64;
    const fileName = uploadedFileName || deedFileName;
    setExtractionStatus("processing");
    setLoadingText("Extracting Legal Clauses and Property Details...");
    try {
      const response = await fetch("/api/extract-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pdfUrl: deedData,
          fileName: fileName,
          schema: dataSchema,
          template: tailwindTemplate
        }),
      });

      if (response.ok) {
        setLoadingText("Performing Automated Financial Mathematics...");
        const data = await response.json();
        setExtractedData(data);
        setExtractionStatus("completed");
        setStep(3);
      } else {
        if (response.status === 413) {
          const msg = "File is too large for Vercel Serverless (HTTP 413 Content Too Large). Please upload a document smaller than 3.2MB.";
          setExtractionError(msg);
          alert(msg);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.error || ("Server error (status " + response.status + ")");
          setExtractionError(msg);
          console.error("Extraction failed:", msg);
        }
        setExtractionStatus("idle");
      }
    } catch (error) {
      console.error("Error during extraction:", error);
      setExtractionStatus("idle");
    }
  };

  return (
    <>
        {/* 3-Step Progress Indicator */}
        <div className="grid grid-cols-3 gap-8 px-8 max-w-2xl mx-auto">
          {[
            { id: 1, label: "Template", icon: LayoutDashboard },
            { id: 2, label: "Acquisition", icon: FileCheck },
            { id: 3, label: "Intelligence", icon: Sparkles },
          ].map((s) => (
            <div 
              key={s.id}
              className={cn(
                "flex flex-col items-center gap-4 group transition-all duration-700",
                step >= s.id ? "opacity-100" : "opacity-20"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 border",
                step === s.id ? "bg-primary text-white scale-125 shadow-2xl shadow-primary/60 border-primary border-4" : "bg-white/5 border-white/5"
              )}>
                <s.icon className="w-6 h-6" />
              </div>
              <span className="text-[9px] uppercase font-black tracking-[0.2em] text-center">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="transition-all duration-1000 transform">
          {step === 1 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 max-w-3xl mx-auto">
              <div className="text-center space-y-4">
                <h2 className="text-6xl font-serif font-black tracking-tighter leading-tight italic">Reference Synthesis</h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                  Upload your target valuation report. Our AI will digitally reconstruct the layout and extract the data structure.
                </p>
              </div>
              <div className="glass p-4 rounded-[3rem] border-white/5">
                <FileUploader 
                  title="Master Template" 
                  description="Upload previous bank-authorized reports"
                  icon="pdf"
                  status={templateStatus}
                  onUpload={handleTemplateUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </div>
              {templateStatus === "uploading" && (
                <div className="space-y-6">
                  <p className="text-center text-[10px] uppercase font-black tracking-widest text-primary animate-pulse">{loadingText}</p>
                  {streamText && (
                    <div className="bg-black/60 border border-primary/20 rounded-[2rem] p-6 h-64 overflow-hidden relative group">
                      <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors pointer-events-none" />
                      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
                      
                      <div className="h-full flex flex-col justify-end text-[10px] font-mono text-primary/70 break-all leading-relaxed tracking-wider">
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {streamText}
                          <span className="inline-block w-2 h-3 bg-primary ml-1 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 max-w-3xl mx-auto">
              <div className="text-center space-y-4">
                <h2 className="text-6xl font-serif font-black tracking-tighter italic">Deep Acquisition</h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                  Provide the scanned Telugu Sale Deed. We will map the legal reality to your financial digital twin.
                </p>
              </div>
              <div className="glass p-4 rounded-[3rem] border-white/5">
                <FileUploader 
                  title="Legal Sale Deed" 
                  description="Upload Word, Excel, or PDF scans"
                  icon="image"
                  status={deedStatus}
                  onUpload={handleDeedUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </div>
              {(deedStatus === "uploading" || extractionStatus === "processing") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-center text-[10px] uppercase font-black tracking-widest text-primary animate-pulse">{loadingText}</p>
                  </div>
                </div>
              )}
              {extractionError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium max-w-md mx-auto">
                  {extractionError}
                </div>
              )}
              <button 
                onClick={() => setStep(1)} 
                className="text-[10px] uppercase font-black tracking-[0.3em] text-primary hover:text-white transition-colors block mx-auto opacity-40 hover:opacity-100"
              >
                Reset Template Context
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12 animate-in fade-in zoom-in-95 duration-1000">
              <div className="text-center space-y-4">
                <h2 className="text-6xl font-serif font-black tracking-tighter italic">Intelligence Review</h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                  Validate the AI-calculated financial reasoning before committing to the final artifact.
                </p>
              </div>
              <ValuationForm 
                initialData={extractedData} 
                schema={dataSchema} 
                template={tailwindTemplate} 
              />
              <button 
                onClick={() => setStep(2)} 
                className="text-[10px] uppercase font-black tracking-[0.3em] text-primary hover:text-white transition-colors block mx-auto opacity-40 hover:opacity-100"
              >
                Re-upload Deed
              </button>
            </div>
          )}
        </div>
    </>
  );
}
