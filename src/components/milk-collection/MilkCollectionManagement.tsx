import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";

import { MilkCollectionModal } from "./MilkCollectionModal";
import { MilkCollectionTable } from "./MilkCollectionTable";
// ⬇️ No range filters import anymore
// import { MilkCollectionFilters } from "./MilkCollectionFilters";

import { TodaysCollectionSummary } from "./TodaysCollectionSummary";
import { BulkEditCollectionModal } from "./BulkEditCollectionModal";

import { useMilkCollection } from "@/hooks/useMilkCollection";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useToast } from "@/hooks/use-toast";

// If you have a date formatting util, import it; otherwise use a simple fallback
import { formatDate } from "@/lib/dateUtils";

export const MilkCollectionManagement: React.FC = () => {
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSession, setSelectedSession] = React.useState<
    "morning" | "evening"
  >("morning");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCollection, setEditingCollection] = React.useState<any>(null);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = React.useState(false);

  // Pass the selectedDate so the hook can hydrate dailyStats for that day (if supported)
  const {
    collections,
    dailyStats,
    isLoading,
    addCollectionMutation,
    updateCollectionMutation,
    deleteCollectionMutation,
    bulkDeleteMutation,
    bulkUpdateMutation,
  } = useMilkCollection(selectedDate);

  const { isAdmin } = useUserPermissions();
  const toast = useToast();

  // Only editable for today unless admin
  const canModify = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return isAdmin || selectedDate === todayStr;
  }, [isAdmin, selectedDate]);

  // Filter by the single selected date + selected session
  const filteredCollections = React.useMemo(() => {
    if (!collections || isLoading) return [];
    return collections.filter(
      (c: any) =>
        c.collection_date === selectedDate && c.session === selectedSession
    );
  }, [collections, isLoading, selectedDate, selectedSession]);

  // Close modal after successful add/update
  React.useEffect(() => {
    if (
      (addCollectionMutation.isSuccess || updateCollectionMutation.isSuccess) &&
      !addCollectionMutation.isPending &&
      !updateCollectionMutation.isPending
    ) {
      setModalOpen(false);
      setEditingCollection(null);
    }
  }, [
    addCollectionMutation.isSuccess,
    addCollectionMutation.isPending,
    updateCollectionMutation.isSuccess,
    updateCollectionMutation.isPending,
  ]);

  const handleAddCollection = (data: any) => {
    if (!canModify) {
      toast({
        title: "Editing locked",
        description: "Only today's records are editable unless an admin unlocks.",
        variant: "destructive",
      });
      return;
    }
    if (editingCollection) {
      updateCollectionMutation.mutate(data);
    } else {
      addCollectionMutation.mutate(data);
    }
  };

  const handleEditCollection = (row: any) => {
    if (!canModify) {
      toast({
        title: "Editing locked",
        description: "Only today's records are editable unless an admin unlocks.",
        variant: "destructive",
      });
      return;
    }
    setEditingCollection(row);
    setModalOpen(true);
  };

  const handleDeleteCollection = (id: string) => {
    if (!canModify) {
      toast({
        title: "Editing locked",
        description: "Only today's records are editable unless an admin unlocks.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("Delete this collection record?")) {
      deleteCollectionMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (!canModify) {
      toast({
        title: "Editing locked",
        description: "Only today's records are editable unless an admin unlocks.",
        variant: "destructive",
      });
      return;
    }
    if (selectedIds.length > 0 && confirm(`Delete ${selectedIds.length} selected records?`)) {
      bulkDeleteMutation.mutate(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkEdit = (data: { date: string; session: "morning" | "evening" }) => {
    if (!canModify) {
      toast({
        title: "Editing locked",
        description: "Only today's records are editable unless an admin unlocks.",
        variant: "destructive",
      });
      return;
    }
    if (selectedIds.length > 0) {
      bulkUpdateMutation.mutate({ ids: selectedIds, date: data.date, session: data.session });
      setSelectedIds([]);
      setBulkEditModalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Milk Collection</h2>
          <p className="text-sm text-muted-foreground">
            Date: {formatDate ? formatDate(selectedDate) : selectedDate}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="selectedDate">Date</Label>
            <Input
              id="selectedDate"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>

          <div>
            <Label htmlFor="session-selector">Session</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={selectedSession === "morning" ? "default" : "outline"}
                onClick={() => setSelectedSession("morning")}
                className="w-28"
              >
                Morning
              </Button>
              <Button
                type="button"
                variant={selectedSession === "evening" ? "default" : "outline"}
                onClick={() => setSelectedSession("evening")}
                className="w-28"
              >
                Evening
              </Button>
            </div>
          </div>

          <div className="ml-auto">
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Collection
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards (single date) */}
      <TodaysCollectionSummary
        collections={collections || []}
        dailyStats={dailyStats}
        selectedDate={selectedDate}
        isLoading={isLoading}
      />

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkEditModalOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Bulk Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table (filters: selected date + session) */}
      <MilkCollectionTable
        collections={filteredCollections}
        isLoading={isLoading}
        canEdit={canModify}
        canDelete={canModify}
        onEdit={handleEditCollection}
        onDelete={handleDeleteCollection}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectedDate={selectedDate}
        selectedSession={selectedSession}
      />

      {/* Add / Edit Modal */}
      <MilkCollectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAddCollection}
        isLoading={addCollectionMutation.isPending || updateCollectionMutation.isPending}
        initialData={editingCollection}
        session={selectedSession}
        date={selectedDate}
      />

      {/* Bulk Edit Modal */}
      <BulkEditCollectionModal
        open={bulkEditModalOpen}
        onOpenChange={setBulkEditModalOpen}
        onSubmit={handleBulkEdit}
        isLoading={bulkUpdateMutation.isPending}
        selectedCount={selectedIds.length}
      />
    </div>
  );
};
