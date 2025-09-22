import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Gift, 
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { getApiConfig } from '@/lib/config';
import { format } from 'date-fns';

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'freebie' | 'experience' | 'merchandise' | 'other';
  availableFor: string[];
  stock?: number;
  imageUrl?: string;
  redemptionInstructions?: string;
  validUntil?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Partner {
  partnerId: string;
  name?: string;
  status?: string;
}

export default function RewardsManagement() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsCost: 0,
    category: 'discount' as const,
    availableFor: [] as string[],
    stock: undefined as number | undefined,
    imageUrl: '',
    redemptionInstructions: '',
    validUntil: ''
  });

  useEffect(() => {
    fetchRewards();
    fetchPartners();
  }, []);

  const fetchRewards = async () => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/admin/rewards`, {
        headers: {
          'x-admin-secret': localStorage.getItem('adminSecret') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rewards');
      }

      const data = await response.json();
      setRewards(data.rewards || []);
      setStatistics(data.statistics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/admin/partners`, {
        headers: {
          'x-admin-secret': localStorage.getItem('adminSecret') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }

      const data = await response.json();
      setPartners(data.partners || []);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
    }
  };

  const handleCreateReward = () => {
    setIsCreating(true);
    setSelectedReward(null);
    setFormData({
      name: '',
      description: '',
      pointsCost: 0,
      category: 'discount',
      availableFor: [],
      stock: undefined,
      imageUrl: '',
      redemptionInstructions: '',
      validUntil: ''
    });
    setIsDialogOpen(true);
  };

  const handleEditReward = (reward: Reward) => {
    setIsCreating(false);
    setSelectedReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      category: reward.category,
      availableFor: reward.availableFor,
      stock: reward.stock,
      imageUrl: reward.imageUrl || '',
      redemptionInstructions: reward.redemptionInstructions || '',
      validUntil: reward.validUntil || ''
    });
    setIsDialogOpen(true);
  };

  const handleSaveReward = async () => {
    setIsSaving(true);
    setError('');

    try {
      const apiConfig = getApiConfig();
      const url = isCreating 
        ? `${apiConfig.baseUrl}/api/admin/rewards`
        : `${apiConfig.baseUrl}/api/admin/rewards/${selectedReward?.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': localStorage.getItem('adminSecret') || ''
        },
        body: JSON.stringify({
          ...formData,
          pointsCost: Number(formData.pointsCost),
          stock: formData.stock ? Number(formData.stock) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save reward');
      }

      await fetchRewards();
      setIsDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) {
      return;
    }

    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/admin/rewards/${rewardId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-secret': localStorage.getItem('adminSecret') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete reward');
      }

      await fetchRewards();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'discount': return '🏷️';
      case 'freebie': return '🎁';
      case 'experience': return '🎢';
      case 'merchandise': return '🛍️';
      default: return '⭐';
    }
  };

  const togglePartner = (partnerId: string) => {
    setFormData(prev => ({
      ...prev,
      availableFor: prev.availableFor.includes(partnerId)
        ? prev.availableFor.filter(id => id !== partnerId)
        : [...prev.availableFor, partnerId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Rewards Management</h1>
          <p className="text-muted-foreground">Create and manage rewards for the bonus program</p>
        </div>
        <Button onClick={handleCreateReward}>
          <Plus className="mr-2 h-4 w-4" />
          Create Reward
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalRewards}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.activeRewards}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.categories?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalStock || '∞'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rewards Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Rewards</CardTitle>
          <CardDescription>
            Manage your rewards catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Available For</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.map((reward) => (
                <TableRow key={reward.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reward.name}</p>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getCategoryIcon(reward.category)}</span>
                      <span className="capitalize">{reward.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{reward.pointsCost}</TableCell>
                  <TableCell>
                    {reward.availableFor.length === 0 ? (
                      <Badge variant="default">All Partners</Badge>
                    ) : (
                      <Badge variant="outline">
                        {reward.availableFor.length} Partner{reward.availableFor.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {reward.stock ? (
                      <span>{reward.stock}</span>
                    ) : (
                      <span className="text-muted-foreground">Unlimited</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reward.status === 'active' ? 'default' : 'secondary'}>
                      {reward.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReward(reward)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReward(reward.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rewards.length === 0 && (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No rewards created yet</p>
              <Button onClick={handleCreateReward} className="mt-4">
                Create Your First Reward
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create New Reward' : 'Edit Reward'}
            </DialogTitle>
            <DialogDescription>
              {isCreating ? 'Add a new reward to the catalog' : 'Update reward details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Reward Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 20% Discount Coupon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">🏷️ Discount</SelectItem>
                    <SelectItem value="freebie">🎁 Freebie</SelectItem>
                    <SelectItem value="experience">🎢 Experience</SelectItem>
                    <SelectItem value="merchandise">🛍️ Merchandise</SelectItem>
                    <SelectItem value="other">⭐ Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this reward offers..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointsCost">Points Cost</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  value={formData.pointsCost}
                  onChange={(e) => setFormData({ ...formData, pointsCost: parseInt(e.target.value) || 0 })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock (Optional)</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redemptionInstructions">Redemption Instructions</Label>
              <Textarea
                id="redemptionInstructions"
                value={formData.redemptionInstructions}
                onChange={(e) => setFormData({ ...formData, redemptionInstructions: e.target.value })}
                placeholder="How to redeem this reward..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Available For Partners</Label>
              <Card>
                <CardContent className="p-4">
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="all-partners"
                          checked={formData.availableFor.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, availableFor: [] });
                            }
                          }}
                        />
                        <Label htmlFor="all-partners" className="font-medium">
                          Available for All Partners
                        </Label>
                      </div>
                      {partners.map((partner) => (
                        <div key={partner.partnerId} className="flex items-center space-x-2">
                          <Checkbox
                            id={partner.partnerId}
                            checked={formData.availableFor.includes(partner.partnerId)}
                            onCheckedChange={() => togglePartner(partner.partnerId)}
                          />
                          <Label htmlFor={partner.partnerId}>
                            {partner.name || partner.partnerId.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReward} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isCreating ? 'Create Reward' : 'Update Reward'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}