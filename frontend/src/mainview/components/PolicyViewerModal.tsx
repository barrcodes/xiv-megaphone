import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PolicyViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
}

export function PolicyViewerModal({ open, onOpenChange, title, content }: PolicyViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </div>
        <div className="prose prose-sm prose-invert max-w-none no-scrollbar overflow-y-auto px-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table({ children }) {
                return (
                  <div className="my-4 max-w-full overflow-x-auto rounded-md border border-border">
                    <table className="m-0 w-full min-w-[32rem] border-collapse">{children}</table>
                  </div>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
