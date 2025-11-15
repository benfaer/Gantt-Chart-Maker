import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

const PREDEFINED_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ef4444', // red
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // violet
];

export function CategoryManager({ projectId, categories, onClose }: {
  projectId: string;
  categories: Category[];
  onClose: () => void;
}) {
  const [items, setItems] = useState<Category[]>(categories);

  const add = async () => {
    const defaultColor = PREDEFINED_COLORS[items.length % PREDEFINED_COLORS.length];
    const { data, error } = await supabase
      .from('categories')
      .insert({ project_id: projectId, name: 'New Category', color: defaultColor })
      .select()
      .single();
    if (error) return toast.error('Failed to add category');
    setItems([...items, data]);
  };

  const update = async (id: string, patch: Partial<Category>) => {
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) return toast.error('Failed to update category');
    setItems(items.map(c => (c.id === id ? { ...c, ...patch } as Category : c)));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return toast.error('Failed to delete category');
    setItems(items.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-card border rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold">Manage Categories</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.map(c => (
            <div key={c.id} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                <div>
                  <Label>Name</Label>
                  <Input value={c.name} onChange={e => update(c.id, { name: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => remove(c.id)}>Delete</Button>
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 items-center">
                  <Input type="color" value={c.color} onChange={e => update(c.id, { color: e.target.value })} className="w-16 h-10" />
                  <div className="flex gap-1 flex-wrap">
                    {PREDEFINED_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: color,
                          borderColor: c.color === color ? '#000' : 'transparent',
                        }}
                        onClick={() => update(c.id, { color })}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between p-6 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={add}>Add Category</Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}


