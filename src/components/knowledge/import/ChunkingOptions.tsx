
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ImportDocumentFormValues } from "./ImportDocumentFormTypes";

interface ChunkingOptionsProps {
  form: UseFormReturn<ImportDocumentFormValues>;
}

export function ChunkingOptions({ form }: ChunkingOptionsProps) {
  const chunkingMethod = form.watch("chunkingMethod");

  return (
    <div className="border rounded-md p-4 space-y-4">
      <h3 className="text-sm font-medium">Chunking Options</h3>
      
      <FormField
        control={form.control}
        name="chunkingMethod"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Chunking Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lineBreak" id="lineBreak" />
                  <Label htmlFor="lineBreak">By Line Break</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paragraph" id="paragraph" />
                  <Label htmlFor="paragraph">By Paragraph</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {chunkingMethod === 'lineBreak' && (
        <FormField
          control={form.control}
          name="lineBreakPattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Line break pattern</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder="\n"
                  {...field} 
                />
              </FormControl>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the pattern to use for line breaks. Examples: 
                <code className="mx-1 px-1 bg-muted rounded">\n</code> for single newline, 
                <code className="mx-1 px-1 bg-muted rounded">\n\n\n</code> for triple newlines.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
