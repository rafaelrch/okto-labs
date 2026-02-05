import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { 
  Sparkles,
  FileText,
  Film,
  Type,
  Image as ImageIcon,
  Lightbulb,
  Megaphone,
  Hash,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useClients } from '@/hooks/useSupabaseData';

interface AgentsPageProps {
  searchQuery: string;
}

// Definição dos agentes disponíveis
const AGENTS = [
  {
    id: 'carousel',
    name: 'Gerador de Carrosseis',
    description: 'Crie carrosseis persuasivos e engajantes para suas redes sociais',
    icon: DocumentDuplicateIcon,
    color: 'bg-blue-500/10 text-blue-500',
    fields: [
      { id: 'idea', label: 'Ideia do Carrossel', type: 'textarea', placeholder: 'Ex: 5 dicas para aumentar suas vendas no Instagram...' },
      { id: 'slides', label: 'Quantidade de Slides', type: 'select', options: ['3', '4', '5', '6', '7', '8', '9', '10'] },
      { id: 'tone', label: 'Tom de Voz', type: 'select', options: ['Profissional', 'Casual', 'Inspirador', 'Educativo', 'Divertido'] },
    ],
  },
  {
    id: 'static',
    name: 'Gerador de Estáticos',
    description: 'Crie copies impactantes para posts estáticos',
    icon: ImageIcon,
    color: 'bg-purple-500/10 text-purple-500',
    fields: [
      { id: 'idea', label: 'Ideia do Post', type: 'textarea', placeholder: 'Ex: Post sobre lançamento de produto...' },
      { id: 'tone', label: 'Tom de Voz', type: 'select', options: ['Profissional', 'Casual', 'Inspirador', 'Educativo', 'Divertido'] },
    ],
  },
  {
    id: 'reels-script',
    name: 'Roteiros para Reels',
    description: 'Gere roteiros completos e envolventes para seus Reels',
    icon: Film,
    color: 'bg-pink-500/10 text-pink-500',
    fields: [
      { id: 'idea', label: 'Ideia do Reels', type: 'textarea', placeholder: 'Ex: Reels mostrando antes e depois de um projeto...' },
      { id: 'duration', label: 'Duração', type: 'select', options: ['15 segundos', '30 segundos', '60 segundos', '90 segundos'] },
      { id: 'style', label: 'Estilo', type: 'select', options: ['Talking Head', 'Tutorial', 'Storytelling', 'Trend', 'Behind the Scenes'] },
    ],
  },
  {
    id: 'reels-titles',
    name: 'Títulos para Reels',
    description: 'Gere títulos chamativos e hooks para seus Reels',
    icon: Type,
    color: 'bg-orange-500/10 text-orange-500',
    fields: [
      { id: 'idea', label: 'Sobre o que é o Reels?', type: 'textarea', placeholder: 'Ex: Dicas de produtividade para empreendedores...' },
      { id: 'quantity', label: 'Quantidade de Opções', type: 'select', options: ['3', '5', '7', '10'] },
    ],
  },
  {
    id: 'ideas',
    name: 'Gerador de Ideias',
    description: 'Gere ideias criativas de conteúdo para seu nicho',
    icon: Lightbulb,
    color: 'bg-yellow-500/10 text-yellow-500',
    fields: [
      { id: 'niche', label: 'Seu Nicho/Segmento', type: 'textarea', placeholder: 'Ex: Marketing Digital, Fitness, Gastronomia...' },
      { id: 'format', label: 'Formato', type: 'select', options: ['Reels', 'Carrossel', 'Stories', 'Post Estático', 'Todos'] },
      { id: 'quantity', label: 'Quantidade de Ideias', type: 'select', options: ['5', '10', '15', '20'] },
    ],
  },
  {
    id: 'caption',
    name: 'Gerador de Legendas',
    description: 'Crie legendas envolventes com CTAs poderosos',
    icon: MessageSquare,
    color: 'bg-green-500/10 text-green-500',
    fields: [
      { id: 'idea', label: 'Sobre o que é o Post?', type: 'textarea', placeholder: 'Ex: Post sobre dicas de organização...' },
      { id: 'tone', label: 'Tom de Voz', type: 'select', options: ['Profissional', 'Casual', 'Inspirador', 'Educativo', 'Divertido'] },
      { id: 'cta', label: 'Tipo de CTA', type: 'select', options: ['Engajamento', 'Vendas', 'Tráfego', 'Compartilhamento', 'Sem CTA'] },
    ],
  },
  {
    id: 'hashtags',
    name: 'Gerador de Hashtags',
    description: 'Gere hashtags relevantes e estratégicas',
    icon: Hash,
    color: 'bg-cyan-500/10 text-cyan-500',
    fields: [
      { id: 'content', label: 'Descreva o Conteúdo', type: 'textarea', placeholder: 'Ex: Post sobre receitas fitness...' },
      { id: 'quantity', label: 'Quantidade', type: 'select', options: ['10', '15', '20', '30'] },
    ],
  },
  {
    id: 'ads',
    name: 'Gerador de Anúncios',
    description: 'Crie copies persuasivos para anúncios pagos',
    icon: Megaphone,
    color: 'bg-red-500/10 text-red-500',
    fields: [
      { id: 'product', label: 'Produto/Serviço', type: 'textarea', placeholder: 'Ex: Curso online de fotografia...' },
      { id: 'platform', label: 'Plataforma', type: 'select', options: ['Facebook/Instagram Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads'] },
      { id: 'objective', label: 'Objetivo', type: 'select', options: ['Conversão', 'Leads', 'Tráfego', 'Reconhecimento'] },
    ],
  },
];

// Componente de animação de texto palavra por palavra
function AnimatedText({ text, isAnimating }: { text: string; isAnimating: boolean }) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const words = text.split(' ');

  useEffect(() => {
    if (!isAnimating) {
      setDisplayedWords(words);
      setCurrentIndex(words.length);
      return;
    }

    setDisplayedWords([]);
    setCurrentIndex(0);

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= words.length) {
          clearInterval(interval);
          return prev;
        }
        setDisplayedWords(current => [...current, words[prev]]);
        return prev + 1;
      });
    }, 30); // Velocidade da animação

    return () => clearInterval(interval);
  }, [text, isAnimating]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown>
        {displayedWords.join(' ')}
      </ReactMarkdown>
    </div>
  );
}

// Componente do Card de Agente
function AgentCard({ 
  agent, 
  onClick 
}: { 
  agent: typeof AGENTS[0]; 
  onClick: () => void;
}) {
  const Icon = agent.icon;

  return (
    <motion.button
      onClick={onClick}
      className="bg-card rounded-xl border border-border p-6 text-left hover:shadow-lg hover:border-primary/30 transition-all group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", agent.color)}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
        {agent.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {agent.description}
      </p>
    </motion.button>
  );
}

// Componente da Página Individual do Agente
function AgentPage({ 
  agent, 
  onBack 
}: { 
  agent: typeof AGENTS[0]; 
  onBack: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  
  const { data: clients } = useClients();

  const Icon = agent.icon;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setOutput('');
    setIsAnimating(true);

    // Simular chamada à API (será substituído pelo n8n)
    // Por enquanto, gera um output de exemplo
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Output de exemplo baseado no tipo de agente
    const exampleOutputs: Record<string, string> = {
      'carousel': `# Carrossel: ${formData.idea || 'Seu Tema'}

## Slide 1 - Hook
**Você está cometendo esses erros?** 🤔

A maioria das pessoas faz isso sem perceber...

---

## Slide 2 - Problema
O maior desafio que enfrentamos é...

- Ponto importante 1
- Ponto importante 2
- Ponto importante 3

---

## Slide 3 - Solução
**Aqui está a solução!** ✨

Siga estes passos simples:

1. Primeiro passo detalhado
2. Segundo passo detalhado
3. Terceiro passo detalhado

---

## Slide 4 - Benefícios
**O que você ganha com isso:**

✅ Benefício 1
✅ Benefício 2
✅ Benefício 3

---

## Slide 5 - CTA
**Gostou do conteúdo?**

👉 Salve este post para consultar depois
👉 Compartilhe com quem precisa
👉 Siga para mais dicas!`,

      'reels-script': `# Roteiro para Reels

## 🎬 HOOK (0-3s)
*[Olhar direto para câmera, expressão surpresa]*

**"Você está fazendo isso ERRADO!"**

---

## 📝 DESENVOLVIMENTO (3-25s)

*[Transição rápida]*

**Cena 1:** "A maioria das pessoas pensa que..."
*[Mostrar exemplo errado]*

**Cena 2:** "Mas a verdade é que..."
*[Revelar o insight]*

**Cena 3:** "O segredo está em..."
*[Demonstrar a solução]*

---

## 🎯 CTA (25-30s)
*[Zoom in no rosto]*

**"Salva esse vídeo e compartilha com alguém que precisa ver isso!"**

---

## 📋 NOTAS DE PRODUÇÃO:
- **Música sugerida:** Trending audio energético
- **Legendas:** Usar texto grande e destacado
- **Edição:** Cortes rápidos a cada 2-3 segundos`,

      'reels-titles': `# Opções de Títulos para seu Reels

## 🔥 Hooks de Alto Impacto:

1. **"Ninguém te conta isso, mas..."**
2. **"Pare de fazer isso AGORA!"**
3. **"O segredo que mudou minha vida..."**
4. **"Você está cometendo esse erro?"**
5. **"3 segundos para mudar sua perspectiva"**

---

## 💡 Títulos Curiosidade:

1. **"Descobri isso depois de 5 anos..."**
2. **"Por que ninguém fala sobre isso?"**
3. **"O que acontece quando você..."**

---

## 📈 Títulos Educativos:

1. **"Como fazer X em 3 passos simples"**
2. **"Guia completo para iniciantes"**
3. **"Tudo que você precisa saber sobre..."**`,

      'default': `# Resultado Gerado

Aqui está o conteúdo gerado com base nas suas informações:

## Seu Input:
${Object.entries(formData).map(([key, value]) => `- **${key}:** ${value}`).join('\n')}

---

## Conteúdo Sugerido:

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Pontos Principais:
- Primeiro ponto relevante
- Segundo ponto relevante
- Terceiro ponto relevante

### Call to Action:
Não esqueça de salvar e compartilhar este conteúdo!

---

*Gerado por IA - Revise e personalize conforme necessário.*`,
    };

    const generatedOutput = exampleOutputs[agent.id] || exampleOutputs['default'];
    setOutput(generatedOutput);
    setIsGenerating(false);

    // Após um tempo, parar a animação
    setTimeout(() => {
      setIsAnimating(false);
    }, generatedOutput.split(' ').length * 30 + 500);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFormValid = agent.fields.some(field => formData[field.id]?.trim());

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", agent.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
        {/* Left Side - Input */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Configurações
          </h2>

          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Seletor de Cliente */}
            <div className="space-y-2">
              <Label htmlFor="client" className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4" />
                Cliente
              </Label>
              <Select
                value={selectedClient}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <p className="text-xs text-muted-foreground">
                  O agente usará informações do cliente selecionado para personalizar a resposta
                </p>
              )}
            </div>

            <div className="border-t border-border my-4" />

            {agent.fields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="min-h-[120px] resize-none"
                  />
                ) : field.type === 'select' && field.options ? (
                  <Select
                    value={formData[field.id] || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, [field.id]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={!isFormValid || isGenerating}
            className="w-full mt-4 btn-primary-gradient"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4 mr-2" />
                Gerar Conteúdo
              </>
            )}
          </Button>
        </div>

        {/* Right Side - Output */}
        <div className="bg-card rounded-xl border border-border flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Resultado
            </h2>
            {output && !isGenerating && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </Button>
            )}
          </div>

          <div 
            ref={outputRef}
            className="flex-1 overflow-y-auto p-6"
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground">Gerando conteúdo...</p>
                    <p className="text-sm text-muted-foreground">Aguarde enquanto a IA trabalha na sua solicitação</p>
                  </div>
                </motion.div>
              ) : output ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AnimatedText text={output} isAnimating={isAnimating} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"
                >
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <SparklesIcon className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium">Pronto para criar!</p>
                  <p className="text-sm">Preencha os campos ao lado e clique em "Gerar Conteúdo"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Principal da Página de Agentes
export function AgentsPage({ searchQuery }: AgentsPageProps) {
  const [selectedAgent, setSelectedAgent] = useState<typeof AGENTS[0] | null>(null);

  // Filtrar agentes pela busca
  const filteredAgents = AGENTS.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedAgent) {
    return <AgentPage agent={selectedAgent} onBack={() => setSelectedAgent(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Agentes IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Escolha um agente especializado para criar conteúdo com inteligência artificial
        </p>
      </div>

      {/* Grid de Agentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAgents.map(agent => (
          <AgentCard 
            key={agent.id} 
            agent={agent} 
            onClick={() => setSelectedAgent(agent)} 
          />
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum agente encontrado para "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
