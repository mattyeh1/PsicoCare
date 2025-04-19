import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";

interface ConsentFormProps {
  title: string;
  content: string;
  onUseTemplate: () => void;
}

const ConsentForm = ({ title, content, onUseTemplate }: ConsentFormProps) => {
  // Function to handle template download (in a real app, this would create a file)
  const handleDownload = () => {
    // Create a blob from the content
    const blob = new Blob([content], { type: "text/plain" });
    
    // Create a download link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replace(/\s+/g, "_")}.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground whitespace-pre-line">
          {content.length > 300 ? (
            <>
              {content.slice(0, 300)}...
              <span className="block mt-2 text-primary font-medium cursor-pointer hover:underline" onClick={onUseTemplate}>
                Ver texto completo
              </span>
            </>
          ) : (
            content
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onUseTemplate}
        >
          <FileText className="h-4 w-4 mr-2" />
          Usar plantilla
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConsentForm;
