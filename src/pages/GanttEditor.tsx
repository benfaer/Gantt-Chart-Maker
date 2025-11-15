import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Palette, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GanttChart } from "@/components/gantt/GanttChart";
import { TaskEditor } from "@/components/gantt/TaskEditor";
import { CategoryManager } from "@/components/gantt/CategoryManager";
import { MilestoneEditor } from "@/components/gantt/MilestoneEditor";

type Project = import("@/integrations/supabase/types").Tables<"projects">;
type Task = import("@/integrations/supabase/types").Tables<"tasks">;
type Category = import("@/integrations/supabase/types").Tables<"categories">;
type Milestone = import("@/integrations/supabase/types").Tables<"milestones">;
type TaskInterval =
  import("@/integrations/supabase/types").Tables<"task_intervals">;

export default function GanttEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [taskIntervals, setTaskIntervals] = useState<TaskInterval[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  );
  const [newMilestoneTaskId, setNewMilestoneTaskId] = useState<string | null>(
    null
  );
  const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timelineMode, setTimelineMode] = useState<
    "weeks" | "intervals" | "months"
  >("weeks");
  const [showCurrentDay, setShowCurrentDay] = useState(false);

  useEffect(() => {
    if (projectId) loadProjectData();
  }, [projectId]);

  // Calculate project duration in months
  const projectMonths = useMemo(() => {
    if (!project) return 0;
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();
    return yearsDiff * 12 + monthsDiff + 1; // +1 to include both start and end months
  }, [project]);

  // Auto-set to months mode if project is longer than 6 months
  useEffect(() => {
    if (projectMonths > 6 && timelineMode !== "months") {
      setTimelineMode("months");
    }
  }, [projectMonths, timelineMode]);

  const loadProjectData = async () => {
    if (!projectId) return;
    setLoading(true);
    const [projectRes, tasksRes, categoriesRes, milestonesRes] =
      await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase
          .from("tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("display_order"),
        supabase.from("categories").select("*").eq("project_id", projectId),
        supabase
          .from("milestones")
          .select("*")
          .eq("project_id", projectId)
          .order("date"),
      ]);
    if (projectRes.data) setProject(projectRes.data);
    const taskList = tasksRes.data || [];
    setTasks(taskList);
    setCategories(categoriesRes.data || []);
    setMilestones(milestonesRes.data || []);

    if (taskList.length > 0) {
      const taskIds = taskList.map((t) => t.id);
      const intervalsRes = await supabase
        .from("task_intervals")
        .select("*")
        .in("task_id", taskIds);
      setTaskIntervals(intervalsRes.data || []);
    } else {
      setTaskIntervals([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    await supabase
      .from("projects")
      .update({
        title: project.title,
        description: project.description,
        start_date: project.start_date,
        end_date: project.end_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    setSaving(false);
  };

  const addNewTask = async () => {
    if (!project) return;
    const maxOrder =
      tasks.length > 0 ? Math.max(...tasks.map((t) => t.display_order), 0) : 0;
    const taskId = crypto.randomUUID();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id: taskId,
        name: "New Task",
        project_id: project.id,
        display_order: maxOrder + 1,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating task:", error);
      return;
    }
    if (data) {
      setTasks([...tasks, data]);
      setEditingTask(data);
    }
  };

  const addNewSubtask = async (parentTaskId: string) => {
    if (!project) return;
    const parentTask = tasks.find((t) => t.id === parentTaskId);
    if (!parentTask) return;

    // Get max order for subtasks of this parent
    const subtasks = tasks.filter((t) => t.parent_task_id === parentTaskId);
    const maxOrder =
      subtasks.length > 0
        ? Math.max(...subtasks.map((t) => t.display_order), 0)
        : 0;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        name: "New Subtask",
        project_id: project.id,
        parent_task_id: parentTaskId,
        display_order: maxOrder + 1,
      })
      .select()
      .single();
    if (error) return;
    setTasks([...tasks, data]);
    setEditingTask(data);
    setShowAddSubtaskModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="w-full mx-auto p-8">
        <div className="bg-card rounded-2xl border border-border shadow-elevated p-8">
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/preview/${project.id}`)}
                variant="outline"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="space-y-4 mb-8 pb-8 border-b">
            <div className="space-y-2 max-w-2xl">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={project.title}
                onChange={(e) =>
                  setProject({ ...project, title: e.target.value })
                }
                placeholder="Enter project title"
              />
            </div>
            <div className="space-y-2 max-w-2xl">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                value={project.description}
                onChange={(e) =>
                  setProject({ ...project, description: e.target.value })
                }
                placeholder="Brief description of the project"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={project.start_date}
                  onChange={(e) =>
                    setProject({ ...project, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={project.end_date}
                  onChange={(e) =>
                    setProject({ ...project, end_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap mb-6 items-center">
            <Button onClick={addNewTask} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
            <Button
              onClick={() => setShowAddSubtaskModal(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Subtask
            </Button>
            <Button
              onClick={() => setShowCategoryManager(true)}
              variant="outline"
              className="gap-2"
            >
              <Palette className="w-4 h-4" />
              Manage Categories
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-sm">Timeline:</Label>
              <div className="flex gap-1 border rounded-lg p-1">
                {projectMonths <= 6 && (
                  <Button
                    variant={timelineMode === "weeks" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimelineMode("weeks")}
                  >
                    Weeks
                  </Button>
                )}
                <Button
                  variant={timelineMode === "months" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimelineMode("months")}
                >
                  Months
                </Button>
                {projectMonths <= 6 && (
                  <Button
                    variant={timelineMode === "intervals" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimelineMode("intervals")}
                  >
                    Interval Dates
                  </Button>
                )}
              </div>
              <Button
                variant={showCurrentDay ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCurrentDay(!showCurrentDay)}
              >
                Show Current Day
              </Button>
            </div>
          </div>

          <GanttChart
            project={project}
            tasks={tasks}
            categories={categories}
            milestones={milestones}
            taskIntervals={taskIntervals}
            onTaskClick={setEditingTask}
            onMilestoneClick={setEditingMilestone}
            timelineMode={timelineMode}
            onReload={loadProjectData}
            showCurrentDay={showCurrentDay}
          />
        </div>
      </div>

      {editingTask && (
        <TaskEditor
          task={editingTask}
          projectId={project.id}
          categories={categories}
          taskIntervals={taskIntervals.filter(
            (ti) => ti.task_id === editingTask.id
          )}
          projectStartDate={project.start_date}
          projectEndDate={project.end_date}
          allTasks={tasks}
          onClose={() => {
            setEditingTask(null);
            loadProjectData();
          }}
          onAddMilestone={() => {
            setNewMilestoneTaskId(editingTask.id);
            setEditingTask(null);
          }}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          projectId={project.id}
          categories={categories}
          onClose={() => {
            setShowCategoryManager(false);
            loadProjectData();
          }}
        />
      )}

      {(editingMilestone || newMilestoneTaskId) && (
        <MilestoneEditor
          milestone={editingMilestone || undefined}
          projectId={project.id}
          projectStartDate={project.start_date}
          projectEndDate={project.end_date}
          taskId={newMilestoneTaskId || undefined}
          onClose={() => {
            setEditingMilestone(null);
            setNewMilestoneTaskId(null);
            loadProjectData();
          }}
        />
      )}

      {showAddSubtaskModal && project && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Select Parent Task</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {tasks
                .filter((t) => {
                  // Only show overklasse tasks
                  if (t.parent_task_id) return false;

                  // Check if task has subtasks
                  const hasSubtasks = tasks.some(
                    (st) => st.parent_task_id === t.id
                  );

                  // If task already has subtasks, allow adding more
                  if (hasSubtasks) return true;

                  // If task doesn't have subtasks, check if it has intervals or milestones
                  // If it has intervals or milestones, don't allow adding subtasks
                  const hasIntervals = taskIntervals.some(
                    (ti) => ti.task_id === t.id
                  );
                  const hasMilestones = milestones.some(
                    (m) => m.task_id === t.id
                  );

                  // Only allow if it doesn't have intervals or milestones
                  return !hasIntervals && !hasMilestones;
                })
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => addNewSubtask(task.id)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    {task.name}
                  </button>
                ))}
            </div>
            {tasks.filter((t) => {
              if (t.parent_task_id) return false;
              const hasSubtasks = tasks.some(
                (st) => st.parent_task_id === t.id
              );
              if (hasSubtasks) return true;
              const hasIntervals = taskIntervals.some(
                (ti) => ti.task_id === t.id
              );
              const hasMilestones = milestones.some((m) => m.task_id === t.id);
              return !hasIntervals && !hasMilestones;
            }).length === 0 && (
              <p className="text-sm text-muted-foreground mb-4 text-center">
                No tasks available. Tasks with intervals or milestones (that
                don't already have subtasks) cannot have subtasks added.
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => setShowAddSubtaskModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
