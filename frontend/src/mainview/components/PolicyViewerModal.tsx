import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface PolicyViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
}

export function PolicyViewerModal({
  open,
  onOpenChange,
  title,
  content,
}: PolicyViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </div>
        <div className="prose prose-sm prose-invert max-w-none no-scrollbar overflow-y-auto px-4">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
