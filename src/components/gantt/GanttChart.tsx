import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Task = Tables<"tasks">;
type Category = Tables<"categories">;
type Milestone = Tables<"milestones">;
type TaskInterval = Tables<"task_intervals">;

export function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function enumerateDays(start: string, end: string) {
  const days: string[] = [];
  const d = new Date(start);
  const until = new Date(end);
  while (d <= until) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function enumerateWeeks(start: string, end: string) {
  const out: { label: string; start: string; end: string }[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Start from the beginning of the week containing the start date
  const d = new Date(startDate);
  const dayOfWeek = d.getDay() || 7; // Convert Sunday (0) to 7
  d.setDate(d.getDate() - (dayOfWeek - 1)); // Go to Monday of that week

  // Continue until we've covered all weeks that overlap with the project period
  // We need to include the week that contains the end date, even if it starts before
  while (true) {
    const weekStart = new Date(d);
    const weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Stop if we've passed the end date (the week start is after end date)
    if (weekStart > endDate) break;

    // Include weeks that overlap with the project period
    // A week overlaps if its start is <= endDate AND its end is >= startDate
    if (weekStart <= endDate && weekEnd >= startDate) {
      const label = `W${getWeekNumber(weekStart)}`;
      out.push({
        label,
        start: weekStart.toISOString().slice(0, 10),
        end: weekEnd.toISOString().slice(0, 10),
      });
    }

    // Move to next week
    d.setDate(d.getDate() + 7);
  }

  return out;
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function enumerateMonths(start: string, end: string) {
  const out: {
    label: string;
    monthLabel: string;
    start: string;
    end: string;
  }[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Start from the first day of the month containing the start date
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  // Continue until we've covered all months that overlap with the project period
  while (d <= endDate) {
    const monthStart = new Date(d);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0); // Last day of month

    // Only include if it overlaps with the project period
    if (monthStart <= endDate && monthEnd >= startDate) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const label = `${
        monthNames[monthStart.getMonth()]
      } ${monthStart.getFullYear()}`;
      const monthLabel = monthNames[monthStart.getMonth()]; // Just month name for months mode
      out.push({
        label,
        monthLabel, // Add month label without year
        start: monthStart.toISOString().slice(0, 10),
        end: monthEnd.toISOString().slice(0, 10),
      });
    }

    // Move to next month
    d.setMonth(d.getMonth() + 1);
  }

  return out;
}

export function GanttChart({
  project,
  tasks,
  categories,
  milestones,
  taskIntervals,
  onTaskClick,
  onMilestoneClick,
  onReload,
  timelineMode = "weeks",
  previewMode = false,
  showCurrentDay = false,
}: {
  project: Project;
  tasks: Task[];
  categories: Category[];
  milestones: Milestone[];
  taskIntervals: TaskInterval[];
  onTaskClick?: (t: Task) => void;
  onMilestoneClick?: (m: Milestone) => void;
  onReload?: () => void;
  timelineMode?: "weeks" | "intervals" | "months";
  previewMode?: boolean;
  showCurrentDay?: boolean;
}) {
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Helper function to create a shaded version of a color
  const shadeColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B)
      .toString(16)
      .slice(1)}`;
  };

  // Group tasks by parent_task_id
  const tasksByParent = useMemo(() => {
    const grouped = new Map<string | null, Task[]>();
    for (const task of tasks) {
      const parentId = task.parent_task_id || null;
      if (!grouped.has(parentId)) {
        grouped.set(parentId, []);
      }
      grouped.get(parentId)!.push(task);
    }
    // Sort tasks within each group by display_order
    for (const [parentId, taskList] of grouped.entries()) {
      taskList.sort((a, b) => a.display_order - b.display_order);
    }
    return grouped;
  }, [tasks]);

  // Get overklasse tasks (tasks with no parent) sorted by display_order
  const overklasseTasks = useMemo(() => {
    return (tasksByParent.get(null) || []).sort(
      (a, b) => a.display_order - b.display_order
    );
  }, [tasksByParent]);

  // Check if we have any subtasks
  const hasSubtasks = useMemo(() => {
    return tasks.some((t) => t.parent_task_id !== null);
  }, [tasks]);
  const days = useMemo(
    () => enumerateDays(project.start_date, project.end_date),
    [project.start_date, project.end_date]
  );
  const weeks = useMemo(
    () => enumerateWeeks(project.start_date, project.end_date),
    [project.start_date, project.end_date]
  );
  const months = useMemo(
    () => enumerateMonths(project.start_date, project.end_date),
    [project.start_date, project.end_date]
  );
  const boundaryDates = useMemo(() => {
    const set = new Set<string>();
    for (const ti of taskIntervals) {
      if (
        ti.start_date >= project.start_date &&
        ti.start_date <= project.end_date
      )
        set.add(ti.start_date);
      if (ti.end_date >= project.start_date && ti.end_date <= project.end_date)
        set.add(ti.end_date);
    }
    return Array.from(set).sort();
  }, [taskIntervals, project.start_date, project.end_date]);
  const dateToPercent = (date: string) => {
    const idx = days.findIndex((d) => d >= date);
    const clamped = idx < 0 ? days.length - 1 : idx;
    return (Math.max(0, clamped) / days.length) * 100;
  };

  const currentDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }, []);

  const showCurrentDayLine =
    showCurrentDay &&
    currentDate >= project.start_date &&
    currentDate <= project.end_date;

  const currentDayPercent = showCurrentDayLine
    ? dateToPercent(currentDate)
    : null;

  const monthGroups = useMemo(() => {
    if (timelineMode === "months") {
      // For months mode, group by year for the top row
      const yearGroups: {
        yearKey: string;
        startIdx: number;
        endIdx: number;
        label: string;
      }[] = [];
      let currentYear = "";
      let startIdx = 0;
      months.forEach((m, idx) => {
        const year = new Date(m.start).getFullYear().toString();
        if (year !== currentYear) {
          if (currentYear) {
            yearGroups[yearGroups.length - 1].endIdx = idx - 1;
          }
          yearGroups.push({
            yearKey: year,
            startIdx: idx,
            endIdx: idx,
            label: year,
          });
          currentYear = year;
        } else {
          yearGroups[yearGroups.length - 1].endIdx = idx;
        }
      });
      return yearGroups;
    } else if (timelineMode === "weeks") {
      // For weeks mode, align months with actual calendar month boundaries (like intervals mode)
      const groups: {
        monthKey: string;
        dates: string[];
        label: string;
        startPercent: number;
        endPercent: number;
      }[] = [];

      // Generate all months in the project period
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      const currentMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      );

      while (currentMonth <= endDate) {
        const monthKey = `${currentMonth.getFullYear()}-${String(
          currentMonth.getMonth() + 1
        ).padStart(2, "0")}`;
        const firstDayOfMonth = monthKey + "-01";
        const d = new Date(firstDayOfMonth + "T00:00:00");
        const label = d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        // Use project start date if it's after the first day of the month
        const startDateForMonth =
          project.start_date > firstDayOfMonth
            ? project.start_date
            : firstDayOfMonth;
        const startPercent = dateToPercent(startDateForMonth);

        // Calculate last day of month
        const lastDayOfMonthDate = new Date(
          d.getFullYear(),
          d.getMonth() + 1,
          0
        );
        const lastDayOfMonth = lastDayOfMonthDate.toISOString().slice(0, 10);
        // Use project end date if it's before the end of the month
        const endDateForMonth =
          project.end_date < lastDayOfMonth ? project.end_date : lastDayOfMonth;
        const endPercent = dateToPercent(endDateForMonth);

        groups.push({
          monthKey,
          dates: [],
          label,
          startPercent,
          endPercent,
        });

        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      return groups;
    } else {
      const groups: {
        monthKey: string;
        dates: string[];
        label: string;
        startPercent: number;
        endPercent: number;
      }[] = [];

      // Generate all months in the project period, not just those with boundary dates
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      const currentMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      );

      while (currentMonth <= endDate) {
        const monthKey = `${currentMonth.getFullYear()}-${String(
          currentMonth.getMonth() + 1
        ).padStart(2, "0")}`;
        const firstDayOfMonth = monthKey + "-01";
        const d = new Date(firstDayOfMonth + "T00:00:00");
        const label = d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        // Get boundary dates for this month
        const monthBoundaryDates = boundaryDates
          .filter((d) => d.slice(0, 7) === monthKey)
          .sort();

        // Use project start date if it's after the first day of the month
        const startDateForMonth =
          project.start_date > firstDayOfMonth
            ? project.start_date
            : firstDayOfMonth;
        const startPercent = dateToPercent(startDateForMonth);

        // Calculate last day of month
        const lastDayOfMonthDate = new Date(
          d.getFullYear(),
          d.getMonth() + 1,
          0
        );
        const lastDayOfMonth = lastDayOfMonthDate.toISOString().slice(0, 10);
        // Use project end date if it's before the end of the month
        const endDateForMonth =
          project.end_date < lastDayOfMonth ? project.end_date : lastDayOfMonth;
        const endPercent = dateToPercent(endDateForMonth);

        groups.push({
          monthKey,
          dates: monthBoundaryDates,
          label,
          startPercent,
          endPercent,
        });

        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      return groups;
    }
  }, [
    weeks,
    months,
    boundaryDates,
    timelineMode,
    dateToPercent,
    project.start_date,
    project.end_date,
  ]);

  return (
    <div className={`w-full ${previewMode ? "" : "overflow-x-auto"}`}>
      {/* Category Legend */}
      {categories.length > 0 && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
          <h4 className="text-sm font-semibold mb-2">Categories</h4>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="w-full"
        style={{
          minWidth: previewMode
            ? "auto"
            : `${
                280 +
                (timelineMode === "weeks"
                  ? Math.max(weeks.length * 40, 400)
                  : timelineMode === "months"
                  ? Math.max(months.length * 60, 400)
                  : Math.max(boundaryDates.length * 20, 400))
              }px`,
        }}
      >
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: hasSubtasks ? `200px 80px 1fr` : `280px 1fr`,
          }}
        >
          {/* Task name column header (empty, just for spacing) */}
          <div className="border-b min-h-[60px]" />

          {/* Subklasse kolonne header (only if hasSubtasks) */}
          {hasSubtasks && <div className="border-b min-h-[60px]" />}

          {/* Timeline header area */}
          <div className="border-b relative min-h-[60px]">
            {/* Month/Year row - current day line should NOT go through this */}
            {timelineMode === "months" ? (
              <div
                className="grid border-b border-r"
                style={{
                  gridTemplateColumns: months.map(() => "1fr").join(" "),
                }}
              >
                {(
                  monthGroups as Array<{
                    yearKey: string;
                    startIdx: number;
                    endIdx: number;
                    label: string;
                  }>
                ).map((group, gIdx) => {
                  const span = group.endIdx - group.startIdx + 1;
                  return (
                    <div
                      key={group.yearKey}
                      className="text-xs font-semibold text-muted-foreground p-1 text-center border-l"
                      style={{
                        gridColumn: `${group.startIdx + 1} / span ${span}`,
                      }}
                    >
                      {group.label}
                    </div>
                  );
                })}
              </div>
            ) : timelineMode === "weeks" || timelineMode === "intervals" ? (
              <div className="relative h-8 border-b border-r">
                {(
                  monthGroups as Array<{
                    monthKey: string;
                    dates: string[];
                    label: string;
                    startPercent: number;
                    endPercent: number;
                  }>
                ).map((group, idx) => {
                  const width = group.endPercent - group.startPercent;
                  return (
                    <div
                      key={group.monthKey}
                      className="absolute top-0 bottom-0 border-l flex items-center justify-center"
                      style={{
                        left: `${group.startPercent}%`,
                        width: `${width}%`,
                      }}
                    >
                      <span className="text-xs font-semibold text-muted-foreground px-2">
                        {group.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {/* Week/Month/Date row */}
            {timelineMode === "weeks" ? (
              <div
                className="grid border-r"
                style={{
                  gridTemplateColumns: weeks.map(() => "1fr").join(" "),
                }}
              >
                {weeks.map((w) => (
                  <div
                    key={w.start}
                    className="text-[10px] text-muted-foreground p-1 text-center border-l"
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            ) : timelineMode === "months" ? (
              <div
                className="grid border-r"
                style={{
                  gridTemplateColumns: months.map(() => "1fr").join(" "),
                }}
              >
                {months.map((m) => (
                  <div
                    key={m.start}
                    className="text-xs text-muted-foreground p-2 text-center border-l"
                  >
                    {m.monthLabel || m.label.split(" ")[0]}
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative h-9 border-r">
                {boundaryDates.map((d) => (
                  <div
                    key={d}
                    style={{
                      position: "absolute",
                      left: `${dateToPercent(d)}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="h-3 w-px bg-muted-foreground/60 mx-auto" />
                    <div className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                      {d.slice(8)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wrapper for tasks and milestones with continuous current day line */}
        <div className="relative" style={{ gridColumn: "1 / -1" }}>
          {/* Current day line - continuous line from first task through milestones/date label */}
          {showCurrentDayLine &&
            currentDayPercent !== null &&
            tasks.length > 0 && (
              <div
                className="absolute border-l-2 border-red-500 z-30 pointer-events-none"
                style={{
                  left: hasSubtasks
                    ? `calc(280px + (100% - 280px) * ${currentDayPercent} / 100)`
                    : `calc(280px + (100% - 280px) * ${currentDayPercent} / 100)`,
                  top: 0,
                  bottom: 0,
                }}
              />
            )}

          {(() => {
            // Build a flat list of rows: only subtasks (no overklasse row if it has subtasks)
            const rows: Array<{
              type: "overklasse" | "subklasse";
              task: Task;
              parentTask?: Task;
              overklasseTask?: Task; // For subtasks, this is the parent overklasse
              isFirstSubtask?: boolean; // True if this is the first subtask for its overklasse
              subtaskCount?: number; // Number of subtasks for the overklasse
            }> = [];

            for (const overklasse of overklasseTasks) {
              const subklasseTasks = tasksByParent.get(overklasse.id) || [];

              if (subklasseTasks.length > 0) {
                // Overklasse har subtasks - ikke legg til overklasse-rad, bare subtasks
                subklasseTasks.forEach((subklasse, idx) => {
                  rows.push({
                    type: "subklasse",
                    task: subklasse,
                    parentTask: overklasse,
                    overklasseTask: overklasse,
                    isFirstSubtask: idx === 0,
                    subtaskCount: subklasseTasks.length,
                  });
                });
              } else {
                // Overklasse har ingen subtasks - legg til overklasse-rad
                rows.push({ type: "overklasse", task: overklasse });
              }
            }

            // Calculate row indices for gridRow span
            let currentRowIndex = 1;
            const rowIndices = new Map<
              Task,
              { start: number; count: number }
            >();

            for (const row of rows) {
              if (row.isFirstSubtask && row.overklasseTask) {
                rowIndices.set(row.overklasseTask, {
                  start: currentRowIndex,
                  count: row.subtaskCount || 1,
                });
              }
              currentRowIndex++;
            }

            // Hvis det ikke er subtasks, bruk samme struktur som før (hver rad er egen grid)
            if (!hasSubtasks) {
              return (
                <>
                  {rows.map((row, rowIdx) => {
                    const task = row.task;
                    const intervals = taskIntervals.filter(
                      (ti) => ti.task_id === task.id
                    );
                    const isOverklasse = row.type === "overklasse";
                    const overklasseColor = task.color || "#e5e7eb";
                    const rowBackgroundColor = overklasseColor;

                    const isLastRow =
                      rowIdx === rows.length - 1 && milestones.length === 0;

                    return (
                      <div
                        key={task.id}
                        className="grid items-stretch"
                        style={{
                          gridTemplateColumns: `280px 1fr`,
                        }}
                      >
                        <div
                          className="border-b p-2 flex items-center justify-between"
                          style={{ backgroundColor: rowBackgroundColor }}
                        >
                          <button
                            className="text-left hover:underline"
                            onClick={() => onTaskClick?.(task)}
                          >
                            {task.name}
                          </button>
                        </div>

                        <div
                          className="border-b border-r relative"
                          style={{
                            backgroundColor: rowBackgroundColor,
                          }}
                        >
                          {/* Current day date label in last task row (only if no milestones) */}
                          {showCurrentDayLine &&
                            currentDayPercent !== null &&
                            milestones.length === 0 &&
                            isLastRow && (
                              <div
                                className="absolute text-xs font-semibold text-red-500 whitespace-nowrap z-40"
                                style={{
                                  left: `${currentDayPercent}%`,
                                  transform: "translateX(-50%)",
                                  bottom: "-18px",
                                }}
                              >
                                {new Date(currentDate).toLocaleDateString()}
                              </div>
                            )}
                          <div className="absolute inset-0 pointer-events-none">
                            {timelineMode === "weeks" ? (
                              <div
                                className="grid h-full"
                                style={{
                                  gridTemplateColumns: weeks
                                    .map(() => "1fr")
                                    .join(" "),
                                }}
                              >
                                {weeks.map((w) => (
                                  <div key={w.start} className="border-l" />
                                ))}
                              </div>
                            ) : timelineMode === "months" ? (
                              <div
                                className="grid h-full"
                                style={{
                                  gridTemplateColumns: months
                                    .map(() => "1fr")
                                    .join(" "),
                                }}
                              >
                                {months.map((m) => (
                                  <div key={m.start} className="border-l" />
                                ))}
                              </div>
                            ) : (
                              <>
                                {boundaryDates.map((d) => (
                                  <div
                                    key={d}
                                    className="absolute border-l"
                                    style={{
                                      left: `${dateToPercent(d)}%`,
                                      top: 0,
                                      bottom: 0,
                                    }}
                                  />
                                ))}
                                <div
                                  className="absolute border-r"
                                  style={{
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                  }}
                                />
                              </>
                            )}
                          </div>
                          <div className="relative h-10">
                            {intervals.map((interval) => {
                              let startIdx = days.findIndex(
                                (d) => d >= interval.start_date
                              );
                              let endIdx = days.findIndex(
                                (d) => d >= interval.end_date
                              );

                              if (startIdx < 0) {
                                if (interval.start_date < project.start_date) {
                                  startIdx = 0;
                                } else {
                                  startIdx = days.length - 1;
                                }
                              }

                              if (endIdx < 0) {
                                if (interval.end_date > project.end_date) {
                                  endIdx = days.length - 1;
                                } else {
                                  endIdx = 0;
                                }
                              }

                              const finalEndIdx = Math.max(startIdx, endIdx);
                              const left = (startIdx / days.length) * 100;
                              const width =
                                ((finalEndIdx - startIdx + 1) / days.length) *
                                100;

                              const cat = interval.category_id
                                ? categoryById.get(interval.category_id)
                                : undefined;
                              const intervalBackgroundColor = shadeColor(
                                overklasseColor,
                                -30
                              );
                              const borderColor =
                                cat?.color || intervalBackgroundColor;
                              return (
                                <div
                                  key={interval.id}
                                  className="absolute top-2 h-6 rounded-md border-2"
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    borderColor: borderColor,
                                    backgroundColor: intervalBackgroundColor,
                                  }}
                                  title={`${interval.start_date} → ${interval.end_date}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            }

            // Hvis det er subtasks, bruk én grid-container for alle radene
            return (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `200px 80px 1fr`,
                }}
              >
                {rows.map((row, rowIdx) => {
                  const task = row.task;
                  const intervals = taskIntervals.filter(
                    (ti) => ti.task_id === task.id
                  );
                  const isOverklasse = row.type === "overklasse";
                  const isSubklasse = row.type === "subklasse";
                  const parentTask = row.parentTask || row.overklasseTask;
                  const overklasseColor = isOverklasse
                    ? task.color || "#e5e7eb"
                    : parentTask?.color || "#e5e7eb";
                  // Subtask-radene skal ha samme bakgrunnsfarge som overklasse
                  const rowBackgroundColor = isSubklasse
                    ? overklasseColor
                    : isOverklasse
                    ? overklasseColor
                    : "#f3f4f6";

                  // Check if this is the last row (for current day label)
                  const isLastRow =
                    rowIdx === rows.length - 1 && milestones.length === 0;

                  const overklasseRowInfo = row.overklasseTask
                    ? rowIndices.get(row.overklasseTask)
                    : null;

                  return (
                    <>
                      {/* Overklasse kolonne */}
                      {hasSubtasks ? (
                        // Hvis dette er første subtask-rad, render overklasse-kolonnen som spenner over alle subtask-radene
                        row.isFirstSubtask &&
                        row.overklasseTask &&
                        overklasseRowInfo ? (
                          <div
                            key={`overklasse-${row.overklasseTask.id}`}
                            className="border-b border-r flex items-center justify-center"
                            style={{
                              backgroundColor: rowBackgroundColor,
                              gridRow: `${overklasseRowInfo.start} / span ${overklasseRowInfo.count}`,
                            }}
                          >
                            <button
                              className="text-center hover:underline font-semibold px-2"
                              onClick={() => onTaskClick?.(row.overklasseTask!)}
                            >
                              {row.overklasseTask.name}
                            </button>
                          </div>
                        ) : isOverklasse ? (
                          // Overklasse-task uten subtasks - vis sentrert som de med subtasks
                          <div
                            key={`overklasse-single-${task.id}`}
                            className="border-b border-r flex items-center justify-center"
                            style={{ backgroundColor: rowBackgroundColor }}
                          >
                            <button
                              className="text-center hover:underline font-semibold px-2"
                              onClick={() => onTaskClick?.(task)}
                            >
                              {task.name}
                            </button>
                          </div>
                        ) : null
                      ) : (
                        // Ingen subtasks - vis normal task-rad
                        <div
                          key={`task-name-${task.id}`}
                          className="border-b p-2 flex items-center justify-between"
                          style={{ backgroundColor: rowBackgroundColor }}
                        >
                          <button
                            className="text-left hover:underline"
                            onClick={() => onTaskClick?.(task)}
                          >
                            {task.name}
                          </button>
                        </div>
                      )}

                      {/* Subklasse kolonne (only if hasSubtasks) */}
                      {hasSubtasks && (
                        <div
                          key={`subklasse-${task.id}`}
                          className="border-b p-2 flex items-center justify-between"
                          style={{
                            backgroundColor: rowBackgroundColor,
                          }}
                        >
                          {isSubklasse ? (
                            <button
                              className="text-left hover:underline"
                              onClick={() => onTaskClick?.(task)}
                            >
                              {task.name}
                            </button>
                          ) : null}
                        </div>
                      )}

                      {/* Timeline area */}
                      <div
                        key={`timeline-${task.id}`}
                        className="border-b border-r relative"
                        style={{
                          backgroundColor: rowBackgroundColor,
                        }}
                      >
                        {/* Current day date label in last task row (only if no milestones) */}
                        {showCurrentDayLine &&
                          currentDayPercent !== null &&
                          milestones.length === 0 &&
                          isLastRow && (
                            <div
                              className="absolute text-xs font-semibold text-red-500 whitespace-nowrap z-40"
                              style={{
                                left: `${currentDayPercent}%`,
                                transform: "translateX(-50%)",
                                bottom: "-18px",
                              }}
                            >
                              {new Date(currentDate).toLocaleDateString()}
                            </div>
                          )}
                        <div className="absolute inset-0 pointer-events-none">
                          {timelineMode === "weeks" ? (
                            <div
                              className="grid h-full"
                              style={{
                                gridTemplateColumns: weeks
                                  .map(() => "1fr")
                                  .join(" "),
                              }}
                            >
                              {weeks.map((w) => (
                                <div key={w.start} className="border-l" />
                              ))}
                            </div>
                          ) : timelineMode === "months" ? (
                            <div
                              className="grid h-full"
                              style={{
                                gridTemplateColumns: months
                                  .map(() => "1fr")
                                  .join(" "),
                              }}
                            >
                              {months.map((m) => (
                                <div key={m.start} className="border-l" />
                              ))}
                            </div>
                          ) : (
                            <>
                              {boundaryDates.map((d) => (
                                <div
                                  key={d}
                                  className="absolute border-l"
                                  style={{
                                    left: `${dateToPercent(d)}%`,
                                    top: 0,
                                    bottom: 0,
                                  }}
                                />
                              ))}
                              {/* Right border for interval dates */}
                              <div
                                className="absolute border-r"
                                style={{
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                }}
                              />
                            </>
                          )}
                        </div>
                        <div className="relative h-10">
                          {intervals.map((interval) => {
                            // Find the index of the start and end dates in the days array
                            // If date is before project start, use 0
                            // If date is after project end, use last index
                            let startIdx = days.findIndex(
                              (d) => d >= interval.start_date
                            );
                            let endIdx = days.findIndex(
                              (d) => d >= interval.end_date
                            );

                            // Handle dates outside project range
                            if (startIdx < 0) {
                              // Start date is before project start
                              if (interval.start_date < project.start_date) {
                                startIdx = 0;
                              } else {
                                startIdx = days.length - 1;
                              }
                            }

                            if (endIdx < 0) {
                              // End date is after project end
                              if (interval.end_date > project.end_date) {
                                endIdx = days.length - 1;
                              } else {
                                endIdx = 0;
                              }
                            }

                            // Ensure endIdx is at least startIdx
                            const finalEndIdx = Math.max(startIdx, endIdx);

                            // Calculate position and width as percentages
                            const left = (startIdx / days.length) * 100;
                            const width =
                              ((finalEndIdx - startIdx + 1) / days.length) *
                              100;

                            // For subtasks: bruk mørkere versjon av overklasse-fargen
                            // For overklasse: bruk mørkere versjon av overklasse-fargen
                            // Hvis kategori er satt, bruk kategori-fargen som border
                            const cat = interval.category_id
                              ? categoryById.get(interval.category_id)
                              : undefined;
                            const intervalBackgroundColor = shadeColor(
                              overklasseColor,
                              -30
                            ); // Mørkere versjon
                            const borderColor =
                              cat?.color || intervalBackgroundColor;
                            return (
                              <div
                                key={interval.id}
                                className="absolute top-2 h-6 rounded-md border-2"
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  borderColor: borderColor,
                                  backgroundColor: intervalBackgroundColor,
                                }}
                                title={`${interval.start_date} → ${interval.end_date}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })}
              </div>
            );
          })()}

          {/* Milestones row */}
          {milestones.length > 0 && (
            <div
              className="grid items-stretch"
              style={{
                gridTemplateColumns: hasSubtasks
                  ? `200px 80px 1fr`
                  : `280px 1fr`,
              }}
            >
              {hasSubtasks && (
                <div className="border-b bg-yellow-50 dark:bg-yellow-900/20" />
              )}
              {hasSubtasks && (
                <div className="border-b bg-yellow-50 dark:bg-yellow-900/20" />
              )}
              <div className="border-b p-2 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-sm font-semibold">Milestones</div>
              </div>
              <div className="border-b border-r relative bg-yellow-50 dark:bg-yellow-900/20">
                <div className="relative h-12">
                  {/* Current day date label in milestones row */}
                  {showCurrentDayLine && currentDayPercent !== null && (
                    <div
                      className="absolute text-xs font-semibold text-red-500 whitespace-nowrap z-40"
                      style={{
                        left: `${currentDayPercent}%`,
                        transform: "translateX(-50%)",
                        bottom: "-18px",
                      }}
                    >
                      {new Date(currentDate).toLocaleDateString()}
                    </div>
                  )}
                  {(() => {
                    // Sort milestones by date to assign numbers
                    const sortedMilestones = [...milestones]
                      .filter((m) => {
                        const taskIdx = tasks.findIndex(
                          (t) => t.id === m.task_id
                        );
                        return taskIdx >= 0;
                      })
                      .sort((a, b) => a.date.localeCompare(b.date));

                    // Create a map of milestone ID to number
                    const milestoneNumberMap = new Map(
                      sortedMilestones.map((m, index) => [m.id, index + 1])
                    );

                    return sortedMilestones.map((m) => {
                      const idx = days.findIndex((d) => d >= m.date);
                      const left = (Math.max(0, idx) / days.length) * 100;
                      const taskIdx = tasks.findIndex(
                        (t) => t.id === m.task_id
                      );
                      const milestoneNumber = milestoneNumberMap.get(m.id) || 1;

                      // Calculate height: each task row is ~50px (border + padding + h-10)
                      // Line goes from milestone row (bottom at 0) up to the TOP border of the task row
                      // taskIdx 0 is first task (top), taskIdx tasks.length-1 is last task (just above milestone row)
                      // We need to go up (tasks.length - taskIdx) rows to reach the task row
                      // But we want to stop at the TOP border of the task row, not go through it
                      const rowsBetween = tasks.length - taskIdx;
                      // Each row is ~50px. We want to stop right at the top border of the task row
                      // Subtract 3px to ensure the line stops before entering the task row (accounting for border thickness)
                      const lineHeight = rowsBetween * 41;
                      return (
                        <div
                          key={m.id}
                          className="absolute"
                          style={{
                            left: `${left}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div
                            className="absolute border-l-4 border-yellow-400 cursor-pointer hover:border-yellow-500 pointer-events-auto z-10"
                            style={{
                              top: `-${lineHeight}px`,
                              bottom: 0,
                              height: `${lineHeight}px`,
                            }}
                            onClick={() => onMilestoneClick?.(m)}
                            title={m.title}
                          />
                          <div className="absolute top-0 -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded shadow whitespace-nowrap pointer-events-auto z-20 font-semibold">
                            {milestoneNumber}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Milestones table */}
      {milestones.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Milestones</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">
                    Number
                  </th>
                  <th className="text-left p-3 text-sm font-semibold">
                    Description
                  </th>
                  <th className="text-left p-3 text-sm font-semibold">Date</th>
                  <th className="text-left p-3 text-sm font-semibold">Task</th>
                </tr>
              </thead>
              <tbody>
                {[...milestones]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((m, index) => {
                    const task = tasks.find((t) => t.id === m.task_id);
                    return (
                      <tr
                        key={m.id}
                        className="border-t hover:bg-muted/50 cursor-pointer"
                        onClick={() => onMilestoneClick?.(m)}
                      >
                        <td className="p-3 text-sm font-semibold">
                          {index + 1}
                        </td>
                        <td className="p-3 text-sm">{m.title}</td>
                        <td className="p-3 text-sm">
                          {new Date(m.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-sm">
                          {task?.name || "No task"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
