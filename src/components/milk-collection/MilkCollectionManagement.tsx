import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, ScanLine, Search } from "lucide-react";

import { MilkCollectionModal } from "./MilkCollectionModal";
import { MilkCollectionTable } from "./MilkCollectionTable";
import { UndoLastEntry, rememberEntry } from "./UndoLastEntry";
import { TodaysCollectionSummary } from "./TodaysCollectionSummary";
import { BulkEditCollectionModal } from "./BulkEditCollectionModal";
import { SlipScanModal } from "./SlipScanModal";

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
  const [slipScanOpen, setSlipScanOpen] = React.useState(false);

  const {
    collections,
    farmers,
    dailyStats,
    isLoading,
    addCollectionMutation,
    updateCollectionMutation,
    deleteCollectionMutation,
    bulkDeleteMutation,
    bulkUpdateMutation,
  } = useMilkCollection(selectedDate);

  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();

  const canModify = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return isAdmin || selectedDate === todayStr;
  }, [isAdmin, selectedDate]);

  const [search, setSearch] = React.useState("");

  const filteredCollections = React.useMemo(() => {
    if (!collections || isLoading) return [];
    const q = search.trim().toLowerCase();
    // Searching by farmer looks past the selected date and session. Reprinting
    // a slip from three weeks ago otherwise means knowing the exact date it
    // was recorded, which nobody does.
    if (q) {
      return collections
        .filter(
          (c: any) =>
            String(c.farmers?.farmer_code ?? "").toLowerCase().includes(q) ||
            String(c.farmers?.name ?? "").toLowerCase().includes(q)
        )
        .slice(0, 100);
    }
    return collections.filter(
      (c: any) =>
        c.collection_date === selectedDate && c.session === selectedSession
    );
  }, [collections, isLoading, selectedDate, selectedSession, search]);

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
      addCollectionMutation.mutate(data, {
        onSuccess: (saved: any) => {
          // Offer the entry back for as long as the database will accept the
          // delete. A wrong member code is spotted within seconds, while the
          // farmer is still at the counter.
          const farmer = farmers?.find((f: any) => f.id === data.farmer_id);
          if (saved?.id && saved?.created_at) {
            rememberEntry({
              id: saved.id,
              createdAt: saved.created_at,
              farmerName: farmer?.name ?? 'Unknown',
              farmerCode: farmer?.farmer_code ?? '—',
              quantity: Number(data.quantity ?? 0),
            });
            window.dispatchEvent(new Event('milk-collection-saved'));
          }
        },
      });
    }
  };

  const handleEditCollection = (row: any) => {
    // The farmer is holding paper with these figures on it. Changing them now
    // leaves two versions of the same collection and nothing to say which is
    // right -- exactly the argument the portal exists to prevent.
    if (row?.slip_printed_at && !isAdmin) {
      toast({
        title: "Slip already printed",
        description:
          "The farmer has a printed copy of these figures. Undo the entry within 15 minutes, or ask an admin to correct it.",
        variant: "destructive",
      });
      return;
    }
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

  const handleBulkEdit = (data: { collection_date: string; session: "morning" | "evening" }) => {
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
        updates: {
          collection_date: data.collection_date,
          session: data.session,
        }
      });
      setSelectedIds([]);
      setBulkEditModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden px-2 md:px-0">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Milk Collection</h2>
        <p className="text-sm text-muted-foreground">
          Date: {formatDate ? formatDate(selectedDate) : selectedDate}
        </p>
      </div>

      {/* Controls (STACKED on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
        {/* Date */}
        <div className="w-full min-w-0">
          <Label htmlFor="selectedDate" className="text-sm">Date</Label>
          <Input
            id="selectedDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Session */}
        <div className="w-full min-w-0">
          <Label htmlFor="session-selector" className="text-sm">Session</Label>
          <div className="grid grid-cols-2 gap-2 mt-2 w-full">
            <Button
              type="button"
              size="sm"
              variant={selectedSession === "morning" ? "default" : "outline"}
              onClick={() => setSelectedSession("morning")}
              className="w-full text-xs md:text-sm"
            >
              Morning
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedSession === "evening" ? "default" : "outline"}
              onClick={() => setSelectedSession("evening")}
              className="w-full text-xs md:text-sm"
            >
              Evening
            </Button>
          </div>
        </div>

        {/* Add button */}
        <div className="w-full min-w-0 md:flex md:items-end md:justify-end gap-2">
          {isAdmin && (
            <Button variant="outline" className="w-full md:w-auto" onClick={() => setSlipScanOpen(true)}>
              <ScanLine className="h-4 w-4 mr-2" />
              <span className="truncate">Scan Slip</span>
            </Button>
          )}
          <Button className="w-full md:w-auto" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="truncate">Add Collection</span>
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

      <UndoLastEntry />

      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-9 pl-8"
          placeholder="Find a farmer to reprint a slip (code or name)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {search.trim() && (
        <p className="mb-2 text-xs text-muted-foreground">
          Showing every session for this farmer, newest first — not just{" "}
          {selectedDate} {selectedSession}.
        </p>
      )}

      {/* Records Table (filtered by date + session) */}
      <MilkCollectionTable
        collections={filteredCollections}
        isLoading={isLoading}
        canEdit={canModify}
        canDelete={canModify}
        isAdmin={isAdmin}
        onEdit={handleEditCollection}
        onDelete={handleDeleteCollection}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Add / Edit Modal */}
      <MilkCollectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAddCollection}
        isLoading={addCollectionMutation.isPending || updateCollectionMutation.isPending}
        initialData={editingCollection}
        selectedDate={selectedDate}
        selectedSession={selectedSession}
      />

      {/* Bulk Edit Modal */}
      <BulkEditCollectionModal
        open={bulkEditModalOpen}
        onOpenChange={setBulkEditModalOpen}
        onSubmit={handleBulkEdit}
        isLoading={bulkUpdateMutation.isPending}
        selectedCount={selectedIds.length}
      />

      <SlipScanModal
        open={slipScanOpen}
        onOpenChange={setSlipScanOpen}
        defaultDate={selectedDate}
        defaultSession={selectedSession}
      />
    </div>
  );
};
