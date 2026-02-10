import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAnalystProps {
  iaCommentary: string | null;
  saleContext: string;
  analiseStatus: string | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-sale-analyst`;

export function AIAnalyst({ iaCommentary, saleContext, analiseStatus }: AIAnalystProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          sale_context: saleContext,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      toast.error(e instanceof Error ? e.message : 'Erro no chat');
      // Remove user message if no assistant response was generated
      if (!assistantSoFar) {
        setMessages(prev => prev.filter(m => m !== userMsg));
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const statusBadge = analiseStatus === 'concluido' 
    ? <Badge className="text-[10px] bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">Análise Concluída</Badge>
    : analiseStatus === 'falha'
    ? <Badge variant="destructive" className="text-[10px]">Análise Parcial</Badge>
    : <Badge variant="outline" className="text-[10px]">Pendente</Badge>;

  const quickQuestions = [
    'A comissão está correta?',
    'Explique as deduções',
    'Qual o impacto do parcelamento?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Analista IA</span>
        </div>
        {statusBadge}
      </div>

      {/* IA Commentary (Verdict) */}
      {iaCommentary && (
        <Card className="border-primary/30 bg-primary/5 mb-3 flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">{iaCommentary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!iaCommentary && analiseStatus !== 'concluido' && (
        <Card className="border-border/50 mb-3 flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">Nenhuma análise de IA disponível para esta venda. Faça perguntas abaixo.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="bg-border/30 mb-3" />

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="space-y-3 pr-2">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Pergunte sobre esta venda</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {quickQuestions.map((q, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-[10px] h-7 px-2"
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                )}
                <div className={`rounded-xl px-3 py-2 max-w-[85%] text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50'
                }`}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
                {msg.role === 'user' && (
                  <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div className="bg-muted/50 rounded-xl px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 mt-3 flex-shrink-0">
        <Input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre esta venda..."
          className="text-xs h-9"
          disabled={isLoading}
        />
        <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={sendMessage} disabled={!input.trim() || isLoading}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
