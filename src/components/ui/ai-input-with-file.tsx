"use client";

import { CornerRightUp, FileUp, Paperclip, X } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useFileInput } from "@/hooks/use-file-input";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";



interface AIInputWithFileProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  accept?: string;
  maxFileSize?: number;
  onSubmit?: (message: string, file?: File) => void;
  className?: string;
}

export function AIInputWithFile({
  id = "ai-input-with-file",
  placeholder = "File Upload and Chat!",
  minHeight = 52,
  maxHeight = 200,
  accept = "image/*",
  maxFileSize = 5,
  onSubmit,
  className,
}: AIInputWithFileProps) {
  const [inputValue, setInputValue] = useState<string>("");
  useFileInput({
    accept,
    maxSize: maxFileSize,
  });

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit?.(inputValue);
      setInputValue("");
      adjustHeight(true);
    }
  };

  return (
    <div className={cn("w-full py-2 sm:py-4 px-2 sm:px-0", className)}>
      <div className="relative max-w-xl w-full mx-auto flex flex-col gap-2">
        <div className="relative">
          <Textarea
            id={id}
            placeholder={placeholder}
            className={cn(
              "max-w-xl bg-black/5 dark:bg-white/5 w-full rounded-2xl sm:rounded-3xl pl-8 sm:pl-8 pr-12 sm:pr-16",
              "placeholder:text-black/70 dark:placeholder:text-white/70",
              "border-none ring-black/30 dark:ring-white/30",
              "text-black dark:text-white text-wrap py-3 sm:py-4",
              "text-sm sm:text-base",
              "max-h-[200px] overflow-y-auto resize-none leading-[1.2]",
              `min-h-[${minHeight}px]`
            )}
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <button
            onClick={handleSubmit}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1"
            type="button"
          >
            <CornerRightUp
              className={cn(
                "w-3.5 sm:w-4 h-3.5 sm:h-4 transition-opacity dark:text-white",
                inputValue ? "opacity-100" : "opacity-30"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
