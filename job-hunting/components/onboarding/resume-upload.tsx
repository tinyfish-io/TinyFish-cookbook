"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, AlertCircle, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { parseResume, type ParsedResume } from "@/lib/ai/client";

interface ResumeUploadProps {
  onParsed: (data: ParsedResume, rawText: string, fileName?: string) => void;
}

type UploadState = "idle" | "uploading" | "parsing" | "success" | "error";

export function ResumeUpload({ onParsed }: ResumeUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Plain text
    if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      return await file.text();
    }

    // PDF
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      setStatusMessage("Extracting text from PDF...");
      const pdfjs = await import("pdfjs-dist");

      // Set worker source
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: unknown) => (item as { str: string }).str)
          .join(" ");
        fullText += pageText + "\n";
      }

      return fullText;
    }

    // DOCX
    if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      setStatusMessage("Extracting text from Word document...");
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    throw new Error("Unsupported file format. Please use PDF, DOCX, or TXT files.");
  };

  const processResume = async (text: string, fileName?: string) => {
    setState("parsing");
    setProgress(40);
    setStatusMessage("Analyzing resume with AI...");

    try {
      // Simulate progress during AI parsing
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 1000);

      setProgress(50);
      setStatusMessage("Extracting skills and experience...");

      const parsedData = await parseResume(text);

      clearInterval(progressInterval);
      setProgress(100);
      setStatusMessage("Resume parsed successfully!");
      setState("success");

      // Small delay to show success state
      setTimeout(() => {
        onParsed(parsedData, text, fileName);
      }, 500);
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse resume. Please try again."
      );
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setState("uploading");
    setProgress(10);
    setError(null);
    setStatusMessage(`Processing ${file.name}...`);

    try {
      setProgress(20);
      const text = await extractTextFromFile(file);

      if (text.trim().length < 100) {
        throw new Error(
          "The extracted text seems too short. Please ensure the file contains your resume."
        );
      }

      await processResume(text, file.name);
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process file. Please try again."
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: state === "uploading" || state === "parsing",
  });

  const handlePasteSubmit = async () => {
    if (pastedText.trim().length < 100) {
      setError("Please paste more resume content (at least 100 characters).");
      return;
    }

    setError(null);
    await processResume(pastedText);
  };

  const resetState = () => {
    setState("idle");
    setProgress(0);
    setStatusMessage("");
    setError(null);
    setPastedText("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!pasteMode ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 cursor-pointer",
                "hover:border-burnt-orange/50 hover:bg-burnt-orange/5",
                isDragActive && "border-burnt-orange bg-burnt-orange/10 scale-[1.02]",
                state === "error" && "border-destructive/50 bg-destructive/5",
                (state === "uploading" || state === "parsing") &&
                  "pointer-events-none opacity-80",
                state === "success" && "border-match-excellent bg-match-excellent/10"
              )}
            >
              <input {...getInputProps()} />

              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                    state === "idle" && "bg-muted",
                    state === "uploading" && "bg-burnt-orange/20",
                    state === "parsing" && "bg-burnt-orange/20",
                    state === "success" && "bg-match-excellent/20",
                    state === "error" && "bg-destructive/20"
                  )}
                >
                  {state === "idle" && (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  {(state === "uploading" || state === "parsing") && (
                    <Loader2 className="w-8 h-8 text-burnt-orange animate-spin" />
                  )}
                  {state === "success" && (
                    <Check className="w-8 h-8 text-match-excellent" />
                  )}
                  {state === "error" && (
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  )}
                </div>

                {/* Text */}
                <div className="space-y-2">
                  {state === "idle" && (
                    <>
                      <h3 className="text-lg font-medium">
                        {isDragActive
                          ? "Drop your resume here"
                          : "Upload your resume"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop your PDF, DOCX, or TXT file, or click to
                        browse
                      </p>
                    </>
                  )}

                  {(state === "uploading" || state === "parsing") && (
                    <>
                      <h3 className="text-lg font-medium text-burnt-orange">
                        {statusMessage}
                      </h3>
                      <div className="w-64 mx-auto">
                        <Progress value={progress} className="h-2" />
                      </div>
                    </>
                  )}

                  {state === "success" && (
                    <h3 className="text-lg font-medium text-match-excellent">
                      {statusMessage}
                    </h3>
                  )}

                  {state === "error" && (
                    <>
                      <h3 className="text-lg font-medium text-destructive">
                        Upload failed
                      </h3>
                      <p className="text-sm text-destructive/80">{error}</p>
                    </>
                  )}
                </div>

                {/* File type badges */}
                {state === "idle" && (
                  <div className="flex gap-2 pt-2">
                    <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium">
                      PDF
                    </span>
                    <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium">
                      DOCX
                    </span>
                    <span className="px-3 py-1 rounded-full bg-muted text-xs font-medium">
                      TXT
                    </span>
                  </div>
                )}

                {state === "error" && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                    className="mt-4"
                  >
                    Try again
                  </Button>
                )}
              </div>
            </div>

            {/* Paste option */}
            {state === "idle" && (
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Don&apos;t have a file handy?
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setPasteMode(true)}
                  className="text-burnt-orange hover:text-burnt-orange/80"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Paste resume text instead
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Paste your resume</h3>
                    <p className="text-sm text-muted-foreground">
                      Copy and paste the text content of your resume below
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPasteMode(false);
                      resetState();
                    }}
                  >
                    Back to upload
                  </Button>
                </div>

                <Textarea
                  placeholder="Paste your resume text here...

Example:
John Doe
Software Engineer
john@example.com

Experience:
Senior Developer at Tech Corp (2020-Present)
- Led development of..."
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setError(null);
                  }}
                  className="min-h-[300px] font-mono text-sm"
                  disabled={state === "parsing"}
                />

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                {state === "parsing" && (
                  <div className="space-y-2">
                    <p className="text-sm text-burnt-orange font-medium">
                      {statusMessage}
                    </p>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPasteMode(false);
                      resetState();
                    }}
                    disabled={state === "parsing"}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasteSubmit}
                    disabled={
                      pastedText.trim().length < 100 || state === "parsing"
                    }
                    className="bg-burnt-orange hover:bg-burnt-orange/90"
                  >
                    {state === "parsing" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze Resume
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
