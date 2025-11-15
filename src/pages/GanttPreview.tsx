import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GanttChart } from "@/components/gantt/GanttChart";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Project = import("@/integrations/supabase/types").Tables<"projects">;
type Task = import("@/integrations/supabase/types").Tables<"tasks">;
type Category = import("@/integrations/supabase/types").Tables<"categories">;
type Milestone = import("@/integrations/supabase/types").Tables<"milestones">;
type TaskInterval =
  import("@/integrations/supabase/types").Tables<"task_intervals">;

export default function GanttPreview() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [taskIntervals, setTaskIntervals] = useState<TaskInterval[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timelineMode, setTimelineMode] = useState<
    "weeks" | "intervals" | "months"
  >("weeks");
  const [scale, setScale] = useState(1);
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

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current || !chartRef.current) return;
      const container = containerRef.current;
      const chart = chartRef.current;

      // Wait for next frame to ensure layout is complete
      requestAnimationFrame(() => {
        // Get the chart container (the div that wraps chartRef)
        const chartContainer = chart.parentElement;
        if (!chartContainer) return;

        const containerWidth = chartContainer.clientWidth;
        const containerHeight = chartContainer.clientHeight;
        const chartWidth = chart.scrollWidth;
        const chartHeight = chart.scrollHeight;

        if (chartWidth === 0 || chartHeight === 0) return;

        const scaleX = containerWidth / chartWidth;
        const scaleY = containerHeight / chartHeight;
        const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

        setScale(newScale);
      });
    };

    // Delay to ensure chart is rendered
    const timeoutId = setTimeout(calculateScale, 100);
    window.addEventListener("resize", calculateScale);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", calculateScale);
    };
  }, [
    project,
    tasks,
    categories,
    milestones,
    taskIntervals,
    timelineMode,
    loading,
  ]);

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

  const exportToPDF = async () => {
    if (!chartRef.current) return;
    setExporting(true);

    // Wait for next frame to ensure layout is stable
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Temporarily remove scale transform for export
    const originalTransform = chartRef.current.style.transform;
    const originalWidth = chartRef.current.style.width;
    chartRef.current.style.transform = "none";
    chartRef.current.style.width = "auto";

    // Wait again for layout to update
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(chartRef.current, {
      scale: 2,
      logging: false,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${project?.title || "gantt-chart"}.pdf`);

    // Restore transform
    chartRef.current.style.transform = originalTransform;
    chartRef.current.style.width = originalWidth;
    setExporting(false);
  };

  const exportToImage = async () => {
    if (!chartRef.current) return;
    setExporting(true);

    // Wait for next frame to ensure layout is stable
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Temporarily remove scale transform for export
    const originalTransform = chartRef.current.style.transform;
    const originalWidth = chartRef.current.style.width;
    chartRef.current.style.transform = "none";
    chartRef.current.style.width = "auto";

    // Wait again for layout to update
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(chartRef.current, {
      scale: 2,
      logging: false,
      useCORS: true,
    });

    // Restore transform
    chartRef.current.style.transform = originalTransform;
    chartRef.current.style.width = originalWidth;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${project?.title || "gantt-chart"}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
      setExporting(false);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading preview...</div>
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate(`/editor/${project.id}`)}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Editor
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
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
            </div>
            <Button
              variant={showCurrentDay ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCurrentDay(!showCurrentDay)}
            >
              Show Current Day
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={exportToImage}
                disabled={exporting}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export as Image
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exporting}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export as PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden p-4 flex flex-col"
      >
        <div className="w-full mb-4 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Timeline: {new Date(project.start_date).toLocaleDateString()} -{" "}
            {new Date(project.end_date).toLocaleDateString()}
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <div
            ref={chartRef}
            className="bg-card rounded-lg border p-8"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: scale < 1 ? `${100 / scale}%` : "100%",
              maxWidth: "100%",
            }}
          >
            <GanttChart
              project={project}
              tasks={tasks}
              categories={categories}
              milestones={milestones}
              taskIntervals={taskIntervals}
              timelineMode={timelineMode}
              previewMode
              showCurrentDay={showCurrentDay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
