import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "lucide-react";

const CustomModule = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Módulo Personalizado</h1>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            Informações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As informações deste módulo serão adicionadas em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomModule;
