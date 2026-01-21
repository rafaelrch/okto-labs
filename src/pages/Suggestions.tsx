import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, MessageSquare, Bug, Sparkles, Palette, Layers, HelpCircle, CheckCircle2, Clock, XCircle, Filter } from 'lucide-react';
import { useSuggestions, useEmployees, type Suggestion } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SuggestionsPageProps {
  searchQuery: string;
}

const categoryConfig = {
  bug: { label: 'Bug', icon: Bug, color: 'bg-destructive/20 text-destructive' },
  improvement: { label: 'Melhoria', icon: Sparkles, color: 'bg-primary/20 text-primary' },
  feature: { label: 'Nova Funcionalidade', icon: Layers, color: 'bg-success/20 text-success' },
  ui: { label: 'Interface', icon: Palette, color: 'bg-warning/20 text-warning' },
  other: { label: 'Outro', icon: HelpCircle, color: 'bg-muted text-muted-foreground' },
};

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-muted text-muted-foreground', icon: Clock },
  under_review: { label: 'Em Análise', color: 'bg-primary/20 text-primary', icon: MessageSquare },
  implemented: { label: 'Implementada', color: 'bg-success/20 text-success', icon: CheckCircle2 },
  rejected: { label: 'Rejeitada', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', color: 'bg-warning/20 text-warning' },
  high: { label: 'Alta', color: 'bg-destructive/20 text-destructive' },
};

export function SuggestionsPage({ searchQuery }: SuggestionsPageProps) {
  const { data: suggestions, loading, create, update } = useSuggestions();
  const { data: employees } = useEmployees();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'improvement' as Suggestion['category'],
    priority: 'medium' as Suggestion['priority'],
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'improvement',
      priority: 'medium',
    });
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para enviar sugestões');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    try {
      await create({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'pending',
      });
      toast.success('Sugestão enviada com sucesso! Obrigado pelo seu feedback.');
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao enviar sugestão');
    }
  };

  const getAuthorName = (userId?: string) => {
    if (!userId) return 'Usuário';
    const employee = employees.find(e => e.user_id === userId);
    return employee?.name || 'Usuário';
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesSearch = 
      suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suggestion.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || suggestion.category === filterCategory;
    const matchesStatus = !filterStatus || suggestion.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const SuggestionCard = ({ suggestion }: { suggestion: Suggestion }) => {
    const isMySuggestion = suggestion.user_id === user?.id;

    return (
      <Card className={cn(
        'hover:shadow-md transition-all duration-200',
        isMySuggestion && 'border-primary/30 border-2'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg truncate">{suggestion.title}</CardTitle>
              </div>
              {isMySuggestion && (
                <Badge variant="outline" className="text-xs mb-2">
                  Minha sugestão
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {suggestion.description}
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className={categoryConfig[suggestion.category].color}>
              {categoryConfig[suggestion.category].label}
            </Badge>
            <Badge className={priorityConfig[suggestion.priority].color}>
              {priorityConfig[suggestion.priority].label}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{getAuthorName(suggestion.user_id)}</span>
            <span>{format(new Date(suggestion.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões</h1>
          <p className="text-muted-foreground">
            Compartilhe suas ideias, reporte bugs e sugira melhorias para o sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Sugestão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Sugestão ou Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Melhorar a interface de tarefas"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva sua sugestão ou feedback detalhadamente..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as Suggestion['category'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">🐛 Bug</SelectItem>
                      <SelectItem value="improvement">✨ Melhoria</SelectItem>
                      <SelectItem value="feature">🚀 Nova Funcionalidade</SelectItem>
                      <SelectItem value="ui">🎨 Interface</SelectItem>
                      <SelectItem value="other">💡 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Suggestion['priority'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full btn-primary-gradient">
                Enviar Sugestão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select 
            value={filterCategory || undefined} 
            onValueChange={(value) => setFilterCategory(value || '')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">🐛 Bug</SelectItem>
              <SelectItem value="improvement">✨ Melhoria</SelectItem>
              <SelectItem value="feature">🚀 Nova Funcionalidade</SelectItem>
              <SelectItem value="ui">🎨 Interface</SelectItem>
              <SelectItem value="other">💡 Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select 
          value={filterStatus || undefined} 
          onValueChange={(value) => setFilterStatus(value || '')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">⏳ Pendente</SelectItem>
            <SelectItem value="under_review">🔍 Em Análise</SelectItem>
            <SelectItem value="implemented">✅ Implementada</SelectItem>
            <SelectItem value="rejected">❌ Rejeitada</SelectItem>
          </SelectContent>
        </Select>
        {(filterCategory || filterStatus) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCategory('');
              setFilterStatus('');
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {suggestions.length === 0 ? 'Nenhuma sugestão ainda' : 'Nenhuma sugestão encontrada'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {suggestions.length === 0
                ? 'Seja o primeiro a compartilhar uma ideia ou reportar um bug!'
                : 'Tente ajustar os filtros para encontrar sugestões.'}
            </p>
            {suggestions.length === 0 && (
              <Button
                className="btn-primary-gradient"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Enviar Primeira Sugestão
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuggestions.map(suggestion => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );
}
