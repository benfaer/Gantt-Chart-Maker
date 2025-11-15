import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type Project = import('@/integrations/supabase/types').Tables<'projects'>;

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const setTheme = (t: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('theme', t);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const createNewProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: 'New Gantt Chart',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      })
      .select()
      .single();
    if (error) return;
    navigate(`/editor/${data.id}`);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    await supabase.from('projects').delete().eq('id', id);
    loadProjects();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-display font-bold mb-3 tracking-tight">Gantt Chart Maker</h1>
            <p className="text-muted-foreground text-lg">Create and manage your project timelines</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <Button onClick={createNewProject} size="lg" className="mb-8 gap-2">
          <Plus className="w-5 h-5" />
          Create New Gantt Chart
        </Button>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Get started by creating your first Gantt chart</p>
              <Button onClick={createNewProject} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Chart
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card key={project.id} className="hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group" onClick={() => navigate(`/editor/${project.id}`)}>
                <CardHeader>
                  <CardTitle className="truncate font-display group-hover:text-primary transition-colors">{project.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{project.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
                    </div>
                    <div className="text-muted-foreground">Updated: {new Date(project.updated_at).toLocaleDateString()}</div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={(e) => { e.stopPropagation(); navigate(`/preview/${project.id}`); }}>
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button variant="destructive" size="sm" onClick={(e) => deleteProject(project.id, e)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


