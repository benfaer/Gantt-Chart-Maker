import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;
type TaskInterval = Tables<'task_intervals'>;
type Category = Tables<'categories'>;

export function TaskEditor({
  task,
  projectId,
  categories,
  taskIntervals,
  projectStartDate,
  projectEndDate,
  onClose,
  onAddMilestone,
}: {
  task: Task;
  projectId: string;
  categories: Category[];
  taskIntervals: TaskInterval[];
  projectStartDate: string;
  projectEndDate: string;
  onClose: () => void;
  onAddMilestone?: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [intervals, setIntervals] = useState<TaskInterval[]>(taskIntervals);
  const [color, setColor] = useState(task.color || '#e5e7eb');
  const isOverklasse = !task.parent_task_id;

  // 20 lyse pastellfarger
  const pastelColors = [
    '#FFE5E5', // Lys rosa
    '#FFE5F0', // Lys rosa
    '#FFE5FF', // Lys lilla
    '#F0E5FF', // Lys lilla
    '#E5E5FF', // Lys blå
    '#E5F0FF', // Lys blå
    '#E5FFFF', // Lys cyan
    '#E5FFF0', // Lys grønn
    '#F0FFE5', // Lys grønn
    '#FFFFE5', // Lys gul
    '#FFF0E5', // Lys oransje
    '#FFE5E5', // Lys rød
    '#FFE5D0', // Lys peach
    '#E5D0FF', // Lys lilla
    '#D0E5FF', // Lys blå
    '#D0FFE5', // Lys mint
    '#FFD0E5', // Lys rosa
    '#E5FFD0', // Lys lime
    '#FFE5C0', // Lys beige
    '#C0E5FF', // Lys himmelblå
  ];

  useEffect(() => {
    setName(task.name);
    setIntervals(taskIntervals);
    setColor(task.color || '#e5e7eb');
  }, [task, taskIntervals]);

  const save = async () => {
    const updateData: { name: string; color?: string | null } = { name };
    if (isOverklasse) {
      updateData.color = color || null;
    }
    const { error } = await supabase.from('tasks').update(updateData).eq('id', task.id);
    if (error) {
      toast.error('Failed to save task');
      return;
    }
    toast.success('Task saved');
    onClose();
  };

  const addInterval = async () => {
    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('task_intervals')
      .insert({ task_id: task.id, start_date: start, end_date: end })
      .select()
      .single();
    if (error) return toast.error('Failed to add interval');
    setIntervals([...intervals, data]);
  };

  const updateInterval = async (id: string, patch: Partial<TaskInterval>) => {
    const { error } = await supabase.from('task_intervals').update(patch).eq('id', id);
    if (error) return toast.error('Failed to update interval');
    setIntervals(intervals.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeInterval = async (id: string) => {
    const { error } = await supabase.from('task_intervals').delete().eq('id', id);
    if (error) return toast.error('Failed to remove interval');
    setIntervals(intervals.filter(i => i.id !== id));
  };

  const removeTask = async () => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) return toast.error('Failed to delete task');
    toast.success('Task deleted');
    onClose();
  };

  const addMilestone = () => {
    onAddMilestone?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-card border rounded-lg w-full max-w-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Task</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="space-y-2">
          <Label>Task name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        {isOverklasse && (
          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {pastelColors.map((pastelColor) => (
                <button
                  key={pastelColor}
                  type="button"
                  onClick={() => setColor(pastelColor)}
                  className={`h-12 w-full rounded-md border-2 transition-all ${
                    color === pastelColor
                      ? 'border-foreground scale-110'
                      : 'border-border hover:border-foreground/50'
                  }`}
                  style={{ backgroundColor: pastelColor }}
                  title={pastelColor}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setColor('#e5e7eb')}
              className="w-full"
            >
              Reset to Default
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Intervals</h4>
            <Button variant="outline" onClick={addInterval}>Add Interval</Button>
          </div>
          {intervals.map(i => (
            <div key={i.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <div>
                <Label>Start</Label>
                <Input type="date" value={i.start_date} onChange={e => updateInterval(i.id, { start_date: e.target.value })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="date" value={i.end_date} onChange={e => updateInterval(i.id, { end_date: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background"
                  value={i.category_id ?? ''}
                  onChange={e => updateInterval(i.id, { category_id: e.target.value || null })}
                >
                  <option value="">None</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => removeInterval(i.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Milestones</h4>
            <Button variant="outline" onClick={addMilestone}>Add Milestone</Button>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="destructive" onClick={removeTask}>Delete Task</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}


