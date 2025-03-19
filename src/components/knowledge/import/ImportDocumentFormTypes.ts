
import { z } from "zod";

export const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  chunkingMethod: z.enum(["lineBreak", "paragraph"], {
    required_error: "Please select a chunking method",
  }),
  lineBreakPattern: z.string().optional(),
});

export type ImportDocumentFormValues = z.infer<typeof formSchema>;

export interface ImportDocumentFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}
