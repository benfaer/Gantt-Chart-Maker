import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Milestone = Tables<'milestones'>;

export function MilestoneEditor({ milestone, projectId, projectStartDate, projectEndDate, taskId, onClose }: {
  milestone?: Milestone;
  projectId: string;
  projectStartDate: string;
  projectEndDate: string;
  taskId?: string;
  onClose: () => void;
}) {
  const isNew = !milestone;
  const [title, setTitle] = useState(milestone?.title || '');
  const [date, setDate] = useState(milestone?.date || new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDate(milestone.date);
    }
  }, [milestone]);

  const save = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (isNew) {
      const { error } = await supabase.from('milestones').insert({
        project_id: projectId,
        task_id: taskId || null,
        title: title.trim(),
        date,
      });
      if (error) return toast.error('Failed to create milestone');
      toast.success('Milestone created');
    } else {
      const { error } = await supabase.from('milestones').update({ title: title.trim(), date }).eq('id', milestone.id);
      if (error) return toast.error('Failed to save milestone');
      toast.success('Milestone saved');
    }
    onClose();
  };

  const remove = async () => {
    if (!milestone) return;
    const { error } = await supabase.from('milestones').delete().eq('id', milestone.id);
    if (error) return toast.error('Failed to delete milestone');
    toast.success('Milestone deleted');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border-2 border-border rounded-2xl shadow-elevated w-full max-w-xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-xl font-bold tracking-tight">{isNew ? 'Create Milestone' : 'Edit Milestone'}</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="space-y-2">
          <Label>Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter milestone title" />
        </div>

        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" min={projectStartDate} max={projectEndDate} value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end">
          {!isNew && <Button variant="destructive" onClick={remove}>Delete</Button>}
          <Button onClick={save}>{isNew ? 'Create' : 'Save'}</Button>
        </div>
      </div>
    </div>
  );
}


