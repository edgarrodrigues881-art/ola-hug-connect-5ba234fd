import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const PlaceholderPage = ({ title, description, icon }: PlaceholderPageProps) => (
  <div className="space-y-6 animate-fade-up">
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Card className="glass-card">
      <CardContent className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          {icon || <Construction className="w-8 h-8 text-primary" />}
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Em desenvolvimento</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Este módulo está sendo construído e estará disponível em breve.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default PlaceholderPage;
