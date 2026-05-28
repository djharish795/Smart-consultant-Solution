"use client";

import React, { useState } from "react";
import { FileBadge2, BadgeCheck, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  title: string;
  description: string;
  onUpload: (file: File) => Promise<void>;
  icon?: "pdf" | "image";
  status: "idle" | "uploading" | "completed";
  accept?: string;
}

export default function FileUploader({
  title,
  description,
  onUpload,
  icon,
  status,
  accept = ".pdf,.docx,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}: FileUploaderProps) {
  const [isOver, setIsOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validateFile = (file: File): boolean => {
    setErrorMsg("");
    const allowedExtensions = [".pdf", ".docx", ".jpeg", ".jpg", ".png", ".webp", ".gif"];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];
    const isValidMime = allowedMimeTypes.includes(file.type) || file.type.startsWith("image/");

    if (!isValidExtension && !isValidMime) {
      setErrorMsg("Required format: PDF, DOCX, or Image (JPEG/PNG/WebP/GIF) only.");
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (validateFile(file)) {
        onUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        onUpload(file);
      }
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative glass p-8 rounded-2xl border-2 border-dashed transition-all duration-300 group cursor-pointer",
        isOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-white/20 hover:border-primary/50",
        status === "completed" && "border-amber-500/50 bg-amber-50/50"
      )}
    >
      <input
        type="file"
        accept={accept}
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center text-center space-y-4">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
          status === "completed" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
        )}>
          {status === "uploading" ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : status === "completed" ? (
            <BadgeCheck className="w-8 h-8" />
          ) : icon === "pdf" ? (
            <FileBadge2 className="w-8 h-8" />
          ) : (
            <ImagePlus className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-lg">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/25 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
            {errorMsg}
          </p>
        )}

        {status === "completed" && (
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
            Success
          </div>
        )}
      </div>
    </div>
  );
}
