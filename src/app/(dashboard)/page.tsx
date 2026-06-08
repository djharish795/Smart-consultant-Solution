"use client";

import React, { useState } from "react";
import ValuationForm from "@/components/ValuationForm";
import FileUploader from "@/components/FileUploader";
import { Bot, ArrowRight, PanelsTopLeft, ScanSearch, Workflow, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [step, setStep] = useState(1);
  const [templateStatus, setTemplateStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [applicationStatus, setApplicationStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "processing" | "completed">("idle");
  const [loadingText, setLoadingText] = useState("");
  const [streamText, setStreamText] = useState("");

  const [extractedData, setExtractedData] = useState<any>(null);
  const [tailwindTemplate, setTailwindTemplate] = useState<string>("");
  const [dataSchema, setDataSchema] = useState<any[]>([]);

  const [applicationBase64, setApplicationBase64] = useState<string>("");

  const handleTemplateUpload = async (file: File) => {
    setTemplateStatus("uploading");
    setStreamText("");
    setLoadingText("Initializing Digital Twin Reconstruction...");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        setLoadingText("Analyzing Page Layouts & Branding...");
        const base64 = reader.result as string;
        const supabaseClient = createClient();
        const { data: { session } } = await supabaseClient.auth.getSession();
        const token = session?.access_token;

        const response = await fetch("/api/analyze-template", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ imageUrl: base64 }),
        });
        
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            setLoadingText("Synthesizing Custom Tailwind Schema...");
            const { tailwindTemplate, dataSchema } = await response.json();
            setTailwindTemplate(tailwindTemplate === "ORIGINAL_TEMPLATE_BASE64" ? base64 : tailwindTemplate);
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
              setTailwindTemplate(parsedResult.tailwindTemplate === "ORIGINAL_TEMPLATE_BASE64" ? base64 : parsedResult.tailwindTemplate);
              setDataSchema(parsedResult.dataSchema);
              setTemplateStatus("completed");
              setTimeout(() => setStep(2), 1000);
            } catch (e) {
              try {
                const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
                const parsedResult = JSON.parse(cleaned);
                setTailwindTemplate(parsedResult.tailwindTemplate === "ORIGINAL_TEMPLATE_BASE64" ? base64 : parsedResult.tailwindTemplate);
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
            console.error("Template analysis failed");
            setTemplateStatus("idle");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading template:", error);
      setTemplateStatus("idle");
    }
  };

  const handleApplicationUpload = async (file: File) => {
    setApplicationStatus("uploading");
    setLoadingText("Acquiring Application Form...");
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setApplicationBase64(base64);
      setApplicationStatus("completed");
      setTimeout(() => setStep(3), 1000);
      // Automatically start extraction after upload (no Base Rates input required)
      await handleStartExtraction(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleStartExtraction = async (pdfBase64?: string) => {
    setExtractionStatus("processing");
    try {
      const supabaseClient = createClient();
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/extract-data", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          pdfUrl: pdfBase64 || applicationBase64,
          schema: dataSchema,
          template: tailwindTemplate
        }),
      });

      if (response.ok) {
        setLoadingText("Synthesizing Application Data...");
        const data = await response.json();
        setExtractedData(data);
        setExtractionStatus("completed");
        setStep(4);
        // Trigger real-time wallet/credits display update
        window.dispatchEvent(new Event("creditsUpdated"));
      } else {
          console.error("Extraction failed");
          setExtractionStatus("idle");
      }
    } catch (error) {
      console.error("Error during extraction:", error);
      setExtractionStatus("idle");
    }
  };

  return (
    <>
        {/* 5-Step Progress Indicator (Updated) */}
        <div className="grid grid-cols-4 gap-8 px-8 max-w-4xl mx-auto">
          {[
            { id: 1, label: "Template", icon: PanelsTopLeft },
            { id: 2, label: "Acquisition", icon: ScanSearch },
            { id: 3, label: "Processing", icon: Workflow },
            { id: 4, label: "Intelligence", icon: Bot },
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
                  Upload your target application form. Our AI will digitally reconstruct the layout and extract the data structure.
                </p>
              </div>
              <div className="glass p-4 rounded-[3rem] border-white/5">
                <FileUploader 
                  title="Master Template" 
                  description="Upload PDF, DOCX, or image reports"
                  icon="pdf"
                  status={templateStatus}
                  onUpload={handleTemplateUpload}
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
                  Provide the scanned Application Form. We will map the real-world form to your digital dossier.
                </p>
              </div>
              <div className="glass p-4 rounded-[3rem] border-white/5">
                <FileUploader 
                  title="Application Form" 
                  description="Upload PDF, DOCX, or image scans"
                  icon="image"
                  status={applicationStatus}
                  onUpload={handleApplicationUpload}
                />
              </div>
              {applicationStatus === "uploading" && (
                <p className="text-center text-[10px] uppercase font-black tracking-widest text-primary animate-pulse">{loadingText}</p>
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
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 max-w-3xl mx-auto">
              <div className="text-center space-y-4">
                <h2 className="text-6xl font-serif font-black tracking-tighter italic">Processing Applications</h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                  Our Claude intelligence engine is extracting employee details and synthesizing business data.
                </p>
              </div>

              <div className="glass p-8 rounded-[3rem] border-white/5 space-y-8 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative shadow-2xl shadow-primary/20">
                  <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <Bot className="w-10 h-10 text-primary" />
                </div>

                <div className="space-y-4 w-full max-w-md">
                  <p className="text-center text-[10px] uppercase font-black tracking-widest text-primary animate-pulse">
                    {loadingText || "Analyzing Application Structure..."}
                  </p>
                  
                  {/* Detailed Step-by-Step progress terminal */}
                  <div className="bg-black/60 border border-primary/20 rounded-[2rem] p-6 font-mono text-[10px] space-y-3 leading-relaxed tracking-wider text-primary/70">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✔</span>
                      <span>Acquired Application Document</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {extractionStatus === "processing" ? (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="text-green-500">✔</span>
                      )}
                      <span className={extractionStatus === "processing" ? "text-white font-bold" : ""}>
                        Extracting Employee & Business Entities...
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {extractionStatus === "processing" ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
                      ) : (
                        <span className="text-green-500">✔</span>
                      )}
                      <span>Synthesizing Application Data</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setStep(2); setApplicationStatus("idle"); }} 
                className="text-[10px] uppercase font-black tracking-[0.3em] text-primary hover:text-white transition-colors block mx-auto opacity-40 hover:opacity-100"
              >
                Cancel and Re-upload
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-12 animate-in fade-in zoom-in-95 duration-1000">
              <div className="text-center space-y-4">
                <h2 className="text-6xl font-serif font-black tracking-tighter italic">Intelligence Review</h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                  Validate the AI-extracted application details before committing to the final dossier.
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
                Re-upload Document
              </button>
            </div>
          )}
        </div>
    </>
  );
}
