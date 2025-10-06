import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";

import { MilkCollectionModal } from "./MilkCollectionModal";
import { MilkCollectionTable } from "./MilkCollectionTable";
import { TodaysCollectionSummary } from "./TodaysCollectionSummary";
import { BulkEditCollectionModal } from "./BulkEditCollectionModal";

import { useMilkCollection } from "@/hooks/useMilkCollection";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useToast } from "@/hooks/use-toast";
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

  const canModify = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return isAdmin || selectedDate === todayStr;
  }, [isAdmin, selectedDate]);

  const filteredCollections = React.useMemo(() => {
    if (!collections || isLoading) return [];
    return collections.filter(
      (c: any) =>
        c.collection_date === selectedDate && c.session === selectedSession
    );
  }, [collections, isLoading, selectedDate, selectedSession]);

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
        description:
          "Only today's records are editable unless an admin unlocks.",
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
        description:
          "Only today's records are editable unless an admin unlocks.",
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
        description:
          "Only today's records are editable unless an admin unlocks.",
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
        description:
          "Only today's records are editable unless an admin unlocks.",
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
        description:
          "Only today's records are editable unless an admin unlocks.",
        variant: "destructive",
      });
      return;
    }
    if (selectedIds.length > 0) {
      bulkUpdateMutation.mutate({
        ids: selectedIds,
        date: data.date,
        session: data.session,
      });
      setSelectedIds([]);
      setBulkEditModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Milk Collection</h2>
        <p className="text-sm text-muted-foreground">
          Date: {formatDate ? formatDate(selectedDate) : selectedDate}
        </p>
      </div>

      {/* Controls (STACKED on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Date */}
        <div className="w-full">
          <Label htmlFor="selectedDate">Date</Label>
          <Input
            id="selectedDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-48"
          />
        </div>

        {/* Session */}
        <div className="w-full">
          <Label htmlFor="session-selector">Session</Label>
          <div className="grid grid-cols-2 gap-2 mt-2 w-full">
            <Button
              type="button"
              variant={selectedSession === "morning" ? "default" : "outline"}
              onClick={() => setSelectedSession("morning")}
              className="w-full"
            >
              Morning
            </Button>
            <Button
              type="button"
              variant={selectedSession === "evening" ? "default" : "outline"}
              onClick={() => setSelectedSession("evening")}
              className="w-full"
            >
              Evening
            </Button>
          </div>
        </div>

        {/* Add button */}
        <div className="w-full md:flex md:items-end md:justify-end">
          <Button className="w-full md:w-auto" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Collection
          </Button>
        </div>
      </div>

      {/* Summary Cards (stacked on mobile) */}
      <TodaysCollectionSummary
        collections={collections || []}
        dailyStats={dailyStats}
        selectedDate={selectedDate}
        isLoading={isLoading}
      />

      {/* Bulk Actions Toolbar (STACKED on mobile) */}
      {selectedIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <span className="text-sm">{selectedIds.length} selected</span>
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={() => setBulkEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bulk Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table (filtered by date + session) */}
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
