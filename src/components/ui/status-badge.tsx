import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'content' | 'task' | 'idea' | 'priority';
}

const contentStatusStyles: Record<string, string> = {
  draft: 'bg-status-draft/10 text-status-draft border-status-draft/20',
  production: 'bg-status-production/10 text-status-production border-status-production/20',
  pending: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  approved: 'bg-status-approved/10 text-status-approved border-status-approved/20',
  published: 'bg-status-published/10 text-status-published border-status-published/20',
  rejected: 'bg-status-rejected/10 text-status-rejected border-status-rejected/20',
};

const taskStatusStyles: Record<string, string> = {
  pending: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  in_progress: 'bg-status-production/10 text-status-production border-status-production/20',
  completed: 'bg-status-approved/10 text-status-approved border-status-approved/20',
};

const ideaStatusStyles: Record<string, string> = {
  new: 'bg-status-production/10 text-status-production border-status-production/20',
  analyzing: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  approved: 'bg-status-approved/10 text-status-approved border-status-approved/20',
  discarded: 'bg-status-draft/10 text-status-draft border-status-draft/20',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
  medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
  high: 'bg-priority-high/10 text-priority-high border-priority-high/20',
  urgent: 'bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20',
};

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  production: 'Em Produção',
  pending: 'Aguardando',
  approved: 'Aprovado',
  published: 'Publicado',
  rejected: 'Reprovado',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  new: 'Nova',
  analyzing: 'Em Análise',
  discarded: 'Descartada',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export function StatusBadge({ status, type = 'content' }: StatusBadgeProps) {
  let styles: Record<string, string>;
  
  switch (type) {
    case 'task':
      styles = taskStatusStyles;
      break;
    case 'idea':
      styles = ideaStatusStyles;
      break;
    case 'priority':
      styles = priorityStyles;
      break;
    default:
      styles = contentStatusStyles;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        styles[status] || 'bg-muted text-muted-foreground border-border'
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
