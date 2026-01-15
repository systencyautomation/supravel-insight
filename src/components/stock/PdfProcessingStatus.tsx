import { CheckCircle, Loader2, FileText, Sparkles, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

interface PdfProcessingStatusProps {
  isParsing: boolean;
  isComplete: boolean;
  rowCount?: number;
  onContinue: () => void;
}

const steps = [
  { id: 1, label: 'Lendo arquivo', icon: FileText },
  { id: 2, label: 'Extraindo dados com IA', icon: Sparkles },
  { id: 3, label: 'Validando estrutura', icon: Table },
];

export function PdfProcessingStatus({ 
  isParsing, 
  isComplete, 
  rowCount = 0,
  onContinue 
}: PdfProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isParsing) {
      // Simulate progress through steps
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < 3) return prev + 1;
          return prev;
        });
      }, 2500);

      // Animate progress bar
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) return prev + Math.random() * 5;
          return prev;
        });
      }, 300);

      return () => {
        clearInterval(stepInterval);
        clearInterval(progressInterval);
      };
    } else if (isComplete) {
      setProgress(100);
      setCurrentStep(3);
    }
  }, [isParsing, isComplete]);

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Dados extraídos com sucesso!
          </h3>
          <p className="text-muted-foreground">
            {rowCount} {rowCount === 1 ? 'item encontrado' : 'itens encontrados'}
          </p>
        </div>

        <Button onClick={onContinue} className="mt-4">
          Continuar para Mapeamento
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Processando PDF com IA...</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div 
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary/10 border border-primary/20' 
                  : isCompleted 
                    ? 'bg-muted/50' 
                    : 'bg-muted/20'
              }`}
            >
              <div className={`p-2 rounded-full ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : isCompleted 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              
              <span className={`text-sm font-medium ${
                isActive 
                  ? 'text-primary' 
                  : isCompleted 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Isso pode levar alguns segundos dependendo do tamanho do arquivo
      </p>
    </div>
  );
}
