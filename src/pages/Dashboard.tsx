import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Eye, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Project = import("@/integrations/supabase/types").Tables<"projects">;

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const createNewProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title: "New Gantt Chart",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 90 * 86400000)
          .toISOString()
          .split("T")[0],
      })
      .select()
      .single();
    if (error) return;
    navigate(`/editor/${data.id}`);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this project?")) return;
    await supabase.from("projects").delete().eq("id", id);
    loadProjects();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              Project Timelines
            </span>
          </div>
          <h1 className="text-6xl font-display font-bold mb-4 tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Gantt Chart Maker
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl">
            Easy to use Gantt chart maker for different projects
          </p>
        </div>

        <Button
          onClick={createNewProject}
          size="lg"
          className="mb-10 gap-2 text-lg px-8 py-6"
        >
          <Plus className="w-5 h-5" />
          Create New Gantt Chart
        </Button>

        {projects.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-16 pb-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No projects yet</h3>
              <p className="text-muted-foreground mb-8 text-lg">
                Get started by creating your first Gantt chart
              </p>
              <Button onClick={createNewProject} className="gap-2" size="lg">
                <Plus className="w-5 h-5" />
                Create Your First Chart
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 hover:border-primary/40 group overflow-hidden"
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <CardTitle className="truncate font-display group-hover:text-primary transition-colors text-lg">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary/60" />
                      <span>
                        {formatDate(project.start_date)} -{" "}
                        {formatDate(project.end_date)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated:{" "}
                      {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/preview/${project.id}`);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => deleteProject(project.id, e)}
                  >
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
