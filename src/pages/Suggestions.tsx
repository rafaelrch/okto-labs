import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, MessageSquare, Bug, Sparkles, Palette, Layers, HelpCircle, CheckCircle2, Clock, XCircle, Filter, Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { useSuggestions, useEmployees, type Suggestion } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/lib/supabase-storage';

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
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'improvement' as Suggestion['category'],
    priority: 'medium' as Suggestion['priority'],
    files: [] as string[],
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'improvement',
      priority: 'medium',
      files: [],
    });
    setFilePreviews([]);
  };

  // Função para fazer upload de arquivos
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validar tipos de arquivo (imagens e vídeos)
    const validFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length !== selectedFiles.length) {
      toast.error('Apenas imagens e vídeos são permitidos');
    }

    if (validFiles.length === 0) return;

    // Criar previews temporários
    const tempPreviews = validFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...tempPreviews]);

    // Fazer upload dos arquivos
    setUploadingFiles(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const url = await uploadFile(file, 'suggestions');
        return url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (successfulUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          files: [...prev.files, ...successfulUrls],
        }));
        toast.success(`${successfulUrls.length} arquivo(s) enviado(s) com sucesso!`);
      }

      if (successfulUrls.length < validFiles.length) {
        toast.error(`${validFiles.length - successfulUrls.length} arquivo(s) falharam no upload`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setUploadingFiles(false);
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remover arquivo
  const removeFile = (index: number) => {
    // Revogar URL temporária se for blob
    if (filePreviews[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviews[index]);
    }
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
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
        files: formData.files.length > 0 ? formData.files : [],
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
      <Card 
        className={cn(
          'hover:shadow-md transition-all duration-200 cursor-pointer',
          isMySuggestion && 'border-primary/30 border-2'
        )}
        onClick={() => setSelectedSuggestion(suggestion)}
      >
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

              {/* Upload de Arquivos */}
              <div className="space-y-2">
                <Label>Anexos (opcional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg border-2 border-dashed border-border transition-colors disabled:opacity-50"
                >
                  {uploadingFiles ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      <span className="text-sm text-muted-foreground">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique para adicionar imagens ou vídeos</span>
                    </>
                  )}
                </button>

                {/* Preview dos arquivos */}
                {(filePreviews.length > 0 || formData.files.length > 0) && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {(filePreviews.length > 0 ? filePreviews : formData.files).map((preview, index) => {
                      const isVideo = preview.includes('video') || /\.(mp4|mov|avi|webm|mkv)$/i.test(preview);
                      return (
                        <div key={index} className="relative group aspect-square">
                          {isVideo ? (
                            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                              <Video className="w-6 h-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full btn-primary-gradient" disabled={uploadingFiles}>
                Enviar Sugestão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedSuggestion} onOpenChange={(open) => !open && setSelectedSuggestion(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          {selectedSuggestion && (
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-xl pr-6">{selectedSuggestion.title}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                {/* Status e Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusConfig[selectedSuggestion.status].color}>
                    {statusConfig[selectedSuggestion.status].label}
                  </Badge>
                  <Badge className={categoryConfig[selectedSuggestion.category].color}>
                    {categoryConfig[selectedSuggestion.category].label}
                  </Badge>
                  <Badge className={priorityConfig[selectedSuggestion.priority].color}>
                    {priorityConfig[selectedSuggestion.priority].label}
                  </Badge>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Descrição</Label>
                  <div className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted/50 rounded-lg p-4">
                    {selectedSuggestion.description}
                  </div>
                </div>

                {/* Anexos */}
                {selectedSuggestion.files && selectedSuggestion.files.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Anexos</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedSuggestion.files.map((file, index) => {
                        const isVideo = /\.(mp4|mov|avi|webm|mkv)$/i.test(file);
                        return (
                          <a
                            key={index}
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-square group"
                          >
                            {isVideo ? (
                              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                                <Video className="w-8 h-8 text-muted-foreground" />
                              </div>
                            ) : (
                              <img
                                src={file}
                                alt={`Anexo ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs">Abrir</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Informações adicionais */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Enviado por</Label>
                    <p className="text-sm font-medium">{getAuthorName(selectedSuggestion.user_id)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Data de envio</Label>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedSuggestion.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Ações para o autor */}
                {selectedSuggestion.user_id === user?.id && selectedSuggestion.status === 'pending' && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      Sua sugestão está pendente de análise.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
