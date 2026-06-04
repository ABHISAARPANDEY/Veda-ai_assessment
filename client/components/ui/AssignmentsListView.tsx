"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Plus, Search, X } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { AssignmentCard } from "./AssignmentCard";
import type { AssignmentDTO } from "../../types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

export function AssignmentsListView({ items }: { items: AssignmentDTO[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const a of items) {
      const l = a.classLevel?.trim();
      if (l) set.add(l);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (level !== "all" && (a.classLevel ?? "") !== level) return false;
      if (needle && !a.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, status, level]);

  const hasFilters = status !== "all" || level !== "all" || q.trim().length > 0;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-secondary">Manage and create assignments for your classes.</p>
        </div>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap relative">
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-inset text-sm"
        >
          <Filter className="h-4 w-4 text-secondary" />
          Filter By
          {hasFilters && <span className="h-2 w-2 rounded-full bg-accent" />}
        </button>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 bg-inset rounded-full px-4 py-2">
            <Search className="h-4 w-4 text-secondary" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted"
              placeholder="Search Assignment"
            />
            {q && (
              <button onClick={() => setQ("")} className="text-muted hover:text-primary" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {filterOpen && (
          <div className="absolute top-14 left-3 bg-card shadow-cardLg rounded-2xl p-4 z-20 w-72 space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select w-full h-10 rounded-lg bg-card border border-border px-3 text-sm focus:border-primary focus:ring-0"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Class / Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="form-select w-full h-10 rounded-lg bg-card border border-border px-3 text-sm focus:border-primary focus:ring-0"
              >
                <option value="all">All levels</option>
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="white"
                size="sm"
                type="button"
                onClick={() => {
                  setStatus("all");
                  setLevel("all");
                }}
              >
                Reset
              </Button>
              <Button variant="dark" size="sm" type="button" onClick={() => setFilterOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-secondary">
          No assignments match your filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((a) => (
            <AssignmentCard key={a._id} a={a} />
          ))}
        </div>
      )}

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8">
        <Link href="/assignments/new">
          <Button variant="dark">
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        </Link>
      </div>
    </div>
  );
}
