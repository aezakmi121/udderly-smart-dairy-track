import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useExpenseManagement, type ExpenseCategory, type ExpenseSource, type PaymentMethod } from '@/hooks/useExpenseManagement';
import { useToast } from '@/hooks/use-toast';

interface ExpenseSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseSettingsModal: React.FC<ExpenseSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { 
    useCategories, 
    useSources, 
    usePaymentMethods, 
    usePaidByPeople,
    createPaidByPerson,
    deletePaidByPerson,
    createCategory,
    updateCategory,
    deleteCategory,
    createSource,
    updateSource,
    deleteSource,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod
  } = useExpenseManagement();
  const { data: categories = [] } = useCategories();
  const { data: sources = [] } = useSources();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: paidByPeople = [] } = usePaidByPeople();
  const { toast } = useToast();

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newSource, setNewSource] = useState({ name: '', description: '' });
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '' });
  const [newPaidByPerson, setNewPaidByPerson] = useState({ name: '' });
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editingSource, setEditingSource] = useState<ExpenseSource | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast({ title: 'Category name is required', variant: 'destructive' });
      return;
    }
    await createCategory.mutateAsync(newCategory);
    setNewCategory({ name: '', description: '' });
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategory.name) {
      toast({ title: 'Category name is required', variant: 'destructive' });
      return;
    }
    await updateCategory.mutateAsync({ id: editingCategory.id, ...newCategory });
    setEditingCategory(null);
    setNewCategory({ name: '', description: '' });
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync(id);
  };

  const handleAddSource = async () => {
    if (!newSource.name) {
      toast({ title: 'Source name is required', variant: 'destructive' });
      return;
    }
    await createSource.mutateAsync(newSource);
    setNewSource({ name: '', description: '' });
  };

  const handleUpdateSource = async () => {
    if (!editingSource || !newSource.name) {
      toast({ title: 'Source name is required', variant: 'destructive' });
      return;
    }
    await updateSource.mutateAsync({ id: editingSource.id, ...newSource });
    setEditingSource(null);
    setNewSource({ name: '', description: '' });
  };

  const handleDeleteSource = async (id: string) => {
    await deleteSource.mutateAsync(id);
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.name) {
      toast({ title: 'Payment method name is required', variant: 'destructive' });
      return;
    }
    await createPaymentMethod.mutateAsync(newPaymentMethod);
    setNewPaymentMethod({ name: '' });
  };

  const handleUpdatePaymentMethod = async () => {
    if (!editingMethod || !newPaymentMethod.name) {
      toast({ title: 'Payment method name is required', variant: 'destructive' });
      return;
    }
    await updatePaymentMethod.mutateAsync({ id: editingMethod.id, ...newPaymentMethod });
    setEditingMethod(null);
    setNewPaymentMethod({ name: '' });
  };

  const handleDeletePaymentMethod = async (id: string) => {
    await deletePaymentMethod.mutateAsync(id);
  };

  const handleAddPaidByPerson = async () => {
    if (!newPaidByPerson.name) {
      toast({ title: 'Person name is required', variant: 'destructive' });
      return;
    }
    await createPaidByPerson.mutateAsync({ name: newPaidByPerson.name });
    setNewPaidByPerson({ name: '' });
  };

  const handleDeletePaidByPerson = async (id: string) => {
    await deletePaidByPerson.mutateAsync(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">Expense Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories" className="flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto flex-shrink-0">
            <TabsList className="inline-flex w-max min-w-full gap-1 p-1">
              <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 sm:px-3">
                Categories
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-xs sm:text-sm px-2 sm:px-3">
                Sources  
              </TabsTrigger>
              <TabsTrigger value="payment-methods" className="text-xs sm:text-sm px-2 sm:px-3">
                Payment
              </TabsTrigger>
              <TabsTrigger value="paid-by" className="text-xs sm:text-sm px-2 sm:px-3">
                Paid By
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="categories" className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Expense Categories</h3>
              
              {/* Add new category */}
              <div className="space-y-3 p-3 sm:p-4 border rounded-lg">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Category Name</Label>
                    <Input
                      placeholder="Enter category name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Description</Label>
                    <Input
                      placeholder="Enter description"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    onClick={editingCategory ? handleUpdateCategory : handleAddCategory} 
                    className="w-full text-sm"
                    disabled={createCategory.isPending || updateCategory.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </Button>
                  {editingCategory && (
                    <Button 
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategory({ name: '', description: '' });
                      }} 
                      variant="outline" 
                      className="w-full text-sm"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Existing categories */}
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base truncate">{category.name}</h4>
                      {category.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingCategory(category);
                          setNewCategory({ name: category.name, description: category.description || '' });
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={deleteCategory.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Expense Sources</h3>
              
              {/* Add new source */}
              <div className="space-y-3 p-3 sm:p-4 border rounded-lg">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Source Name</Label>
                    <Input
                      placeholder="Enter source name"
                      value={newSource.name}
                      onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Description</Label>
                    <Input
                      placeholder="Enter description"
                      value={newSource.description}
                      onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    onClick={editingSource ? handleUpdateSource : handleAddSource} 
                    className="w-full text-sm"
                    disabled={createSource.isPending || updateSource.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingSource ? 'Update Source' : 'Add Source'}
                  </Button>
                  {editingSource && (
                    <Button 
                      onClick={() => {
                        setEditingSource(null);
                        setNewSource({ name: '', description: '' });
                      }} 
                      variant="outline" 
                      className="w-full text-sm"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Existing sources */}
              <div className="space-y-2">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base truncate">{source.name}</h4>
                      {source.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{source.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingSource(source);
                          setNewSource({ name: source.name, description: source.description || '' });
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteSource(source.id)}
                        disabled={deleteSource.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment-methods" className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Payment Methods</h3>
              
              {/* Add new payment method */}
              <div className="space-y-3 p-3 sm:p-4 border rounded-lg">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Payment Method Name</Label>
                    <Input
                      placeholder="Enter payment method name"
                      value={newPaymentMethod.name}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    onClick={editingMethod ? handleUpdatePaymentMethod : handleAddPaymentMethod} 
                    className="w-full text-sm"
                    disabled={createPaymentMethod.isPending || updatePaymentMethod.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingMethod ? 'Update Method' : 'Add Method'}
                  </Button>
                  {editingMethod && (
                    <Button 
                      onClick={() => {
                        setEditingMethod(null);
                        setNewPaymentMethod({ name: '' });
                      }} 
                      variant="outline" 
                      className="w-full text-sm"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Existing payment methods */}
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <h4 className="font-medium text-sm sm:text-base flex-1 truncate">{method.name}</h4>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingMethod(method);
                          setNewPaymentMethod({ name: method.name });
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        disabled={deletePaymentMethod.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paid-by" className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Paid By People</h3>
              
              {/* Add new person */}
              <div className="space-y-3 p-3 sm:p-4 border rounded-lg">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Person Name</Label>
                    <Input
                      placeholder="Enter person name"
                      value={newPaidByPerson.name}
                      onChange={(e) => setNewPaidByPerson({ name: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <Button 
                    onClick={handleAddPaidByPerson} 
                    className="w-full text-sm"
                    disabled={createPaidByPerson.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Person
                  </Button>
                </div>
              </div>

              {/* Existing people */}
              <div className="space-y-2">
                {paidByPeople.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <h4 className="font-medium text-sm sm:text-base flex-1 truncate">{person.name}</h4>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeletePaidByPerson(person.id)}
                        disabled={deletePaidByPerson.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
