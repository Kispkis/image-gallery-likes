import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import {
  Upload, Trash2, LogOut, Camera, Image as ImageIcon,
  Heart, Eye, TrendingUp, Users, BarChart3, Calendar, FileImage, Settings,
  UserPlus, Shield, ShieldCheck, FileText, Download
} from "lucide-react";
import { useLocation, Link } from "wouter";
import type { ImageWithLikes, Like } from "@shared/schema";

type AdminInfo = { id: string; username: string; profilePicture?: string | null; role: string };

const chartConfig = {
  likes: {
    label: "Likes",
    color: "hsl(var(--chart-1))",
  },
  images: {
    label: "Imagens",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [likesDialog, setLikesDialog] = useState<string | null>(null);
  const [profileDialog, setProfileDialog] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const [addAdminDialog, setAddAdminDialog] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [editAdminDialog, setEditAdminDialog] = useState<AdminInfo | null>(null);
  const [editAdminUsername, setEditAdminUsername] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [deleteAdminDialog, setDeleteAdminDialog] = useState<AdminInfo | null>(null);
  const [reportDialog, setReportDialog] = useState<{ filename: string; content: string } | null>(null);

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useQuery<{ admin: AdminInfo } | null>({
    queryKey: ["/api/auth/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const isMaster = session?.admin.role === "master";

  useEffect(() => {
    if (!sessionLoading && (sessionError || session === null)) {
      setLocation("/admin");
    }
  }, [sessionLoading, sessionError, session, setLocation]);

  const { data: images, isLoading } = useQuery<ImageWithLikes[]>({
    queryKey: ["/api/admin/images"],
    enabled: !!session,
  });

  const { data: likes } = useQuery<Like[]>({
    queryKey: ["/api/admin/images", likesDialog, "likes"],
    enabled: !!likesDialog,
  });

  const { data: adminList } = useQuery<AdminInfo[]>({
    queryKey: ["/api/master/admins"],
    enabled: isMaster,
  });

  const { data: reports } = useQuery<string[]>({
    queryKey: ["/api/master/reports"],
    enabled: isMaster,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      setDeleteDialog(null);
      setLikesDialog(null);
      toast({ title: "Imagem eliminada", description: "A imagem foi removida com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao eliminar a imagem.", variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/admin");
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: { username?: string; currentPassword?: string; newPassword?: string }) => {
      const res = await apiRequest("PUT", "/api/admin/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master/admins"] });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Perfil atualizado", description: "As alteracoes foram guardadas com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar perfil.", variant: "destructive" });
    },
  });

  const profilePicMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profilePicture", file);
      const res = await fetch("/api/admin/profile/picture", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro no upload");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/images"] });
      toast({ title: "Foto atualizada", description: "A foto de perfil foi atualizada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar foto.", variant: "destructive" });
    },
  });

  const removeProfilePicMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/profile/picture");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/images"] });
      toast({ title: "Foto removida", description: "A foto de perfil foi removida." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao remover foto.", variant: "destructive" });
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/master/admins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/admins"] });
      setAddAdminDialog(false);
      setNewAdminUsername("");
      setNewAdminPassword("");
      toast({ title: "Admin criado", description: "O novo administrador foi criado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Erro ao criar admin.", variant: "destructive" });
    },
  });

  const editAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { username?: string; password?: string } }) => {
      const res = await apiRequest("PUT", `/api/master/admins/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/admins"] });
      setEditAdminDialog(null);
      toast({ title: "Admin atualizado", description: "O administrador foi atualizado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar admin.", variant: "destructive" });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/master/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/admins"] });
      setDeleteAdminDialog(null);
      toast({ title: "Admin eliminado", description: "O administrador foi eliminado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Erro ao eliminar admin.", variant: "destructive" });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/master/report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/reports"] });
      toast({ title: "Relatorio gerado", description: "O relatorio foi gerado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao gerar relatorio.", variant: "destructive" });
    },
  });

  const handleProfileSave = () => {
    const data: { username?: string; currentPassword?: string; newPassword?: string } = {};
    if (profileUsername && profileUsername !== session?.admin.username) {
      data.username = profileUsername;
    }
    if (newPassword) {
      data.currentPassword = currentPassword;
      data.newPassword = newPassword;
    }
    if (Object.keys(data).length === 0) {
      toast({ title: "Sem alteracoes", description: "Nenhuma alteracao para guardar." });
      return;
    }
    profileMutation.mutate(data);
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    profilePicMutation.mutate(file);
    if (profilePicInputRef.current) profilePicInputRef.current.value = "";
  };

  const openProfileDialog = () => {
    setProfileUsername(session?.admin.username || "");
    setCurrentPassword("");
    setNewPassword("");
    setProfileDialog(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({ title: "Upload concluido!", description: "As imagens foram carregadas com sucesso." });
    } catch (err: any) {
      toast({
        title: "Erro no upload",
        description: err.message || "Ocorreu um erro ao carregar as imagens.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleViewReport = async (filename: string) => {
    try {
      const res = await fetch(`/api/master/reports/${filename}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReportDialog(data);
    } catch {
      toast({ title: "Erro", description: "Erro ao abrir relatorio.", variant: "destructive" });
    }
  };

  const totalLikes = images?.reduce((sum, img) => sum + img.likeCount, 0) ?? 0;
  const totalSize = images?.reduce((sum, img) => sum + img.size, 0) ?? 0;
  const avgLikes = images && images.length > 0 ? (totalLikes / images.length).toFixed(1) : "0";

  const likesBarData = useMemo(() => {
    if (!images) return [];
    return images
      .map((img) => ({
        name: img.originalName.length > 12 ? img.originalName.slice(0, 12) + "..." : img.originalName,
        likes: img.likeCount,
      }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 8);
  }, [images]);

  const sizeDistribution = useMemo(() => {
    if (!images || images.length === 0) return [];
    const ranges = [
      { name: "0-50KB", min: 0, max: 50 * 1024, count: 0 },
      { name: "50-100KB", min: 50 * 1024, max: 100 * 1024, count: 0 },
      { name: "100-150KB", min: 100 * 1024, max: 150 * 1024, count: 0 },
      { name: "150-200KB", min: 150 * 1024, max: 200 * 1024, count: 0 },
    ];
    images.forEach((img) => {
      const range = ranges.find((r) => img.size >= r.min && img.size < r.max);
      if (range) range.count++;
      else ranges[ranges.length - 1].count++;
    });
    return ranges.filter((r) => r.count > 0);
  }, [images]);

  const topImage = useMemo(() => {
    if (!images || images.length === 0) return null;
    return images.reduce((top, img) => (img.likeCount > top.likeCount ? img : top), images[0]);
  }, [images]);

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Camera className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-muted-foreground">A verificar sessao...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center flex-wrap gap-3">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight" data-testid="text-dashboard-title">Dashboard</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {isMaster ? "Admin Master" : "Painel de Administracao"}
              </p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <Link href="/" data-testid="link-view-gallery">
              <Button variant="ghost" size="sm" data-testid="button-view-gallery">
                Ver Galeria
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={openProfileDialog}
              data-testid="button-profile-settings"
            >
              <Avatar className="h-6 w-6">
                {session.admin.profilePicture && (
                  <AvatarImage src={`/uploads/${session.admin.profilePicture}`} alt={session.admin.username} />
                )}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                  {session.admin.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline" data-testid="text-admin-username">{session.admin.username}</span>
              {isMaster && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Master</Badge>}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {isMaster ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">Visao Geral</TabsTrigger>
              <TabsTrigger value="images" data-testid="tab-images">Imagens</TabsTrigger>
              <TabsTrigger value="admins" data-testid="tab-admins">Administradores</TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">Relatorios</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                      <span className="text-sm text-muted-foreground">Total Imagens</span>
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold" data-testid="text-total-images">{images?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(totalSize / 1024).toFixed(0)} KB total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                      <span className="text-sm text-muted-foreground">Total Likes</span>
                      <div className="h-8 w-8 rounded-md bg-chart-1/10 flex items-center justify-center">
                        <Heart className="h-4 w-4 text-chart-1" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold" data-testid="text-total-likes">{totalLikes}</p>
                    <p className="text-xs text-muted-foreground mt-1">Media: {avgLikes} por imagem</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                      <span className="text-sm text-muted-foreground">Mais Popular</span>
                      <div className="h-8 w-8 rounded-md bg-chart-4/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-chart-4" />
                      </div>
                    </div>
                    <p className="text-xl font-bold truncate">{topImage ? topImage.likeCount : 0} likes</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{topImage?.originalName ?? "Sem imagens"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                      <span className="text-sm text-muted-foreground">Admins</span>
                      <div className="h-8 w-8 rounded-md bg-chart-2/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-chart-2" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold" data-testid="text-total-admins">{adminList?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">administradores ativos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-base">Likes por Imagem</CardTitle>
                        <CardDescription>Top imagens com mais likes</CardDescription>
                      </div>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {likesBarData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <BarChart data={likesBarData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="likes" fill="var(--color-likes)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados para exibir</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-base">Tamanho dos Ficheiros</CardTitle>
                        <CardDescription>Distribuicao por faixa de tamanho</CardDescription>
                      </div>
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sizeDistribution.length > 0 ? (
                      <div className="flex items-center flex-wrap gap-6">
                        <ChartContainer config={chartConfig} className="h-[180px] w-[180px] flex-shrink-0">
                          <PieChart>
                            <Pie data={sizeDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} strokeWidth={2}>
                              {sizeDistribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ChartContainer>
                        <div className="space-y-3 flex-1 min-w-0">
                          {sizeDistribution.map((range, i) => (
                            <div key={range.name} className="space-y-1" data-testid={`text-size-range-${i}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                                <div className="flex items-center flex-wrap gap-2 min-w-0">
                                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span className="truncate">{range.name}</span>
                                </div>
                                <span className="text-muted-foreground flex-shrink-0">{range.count}</span>
                              </div>
                              <Progress value={images ? (range.count / images.length) * 100 : 0} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Sem dados para exibir</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="images" className="space-y-6">
              {renderImagesSection()}
            </TabsContent>

            <TabsContent value="admins" className="space-y-6">
              {renderAdminsSection()}
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              {renderReportsSection()}
            </TabsContent>
          </Tabs>
        ) : (
          renderImagesSection()
        )}
      </main>

      {renderDialogs()}
    </div>
  );

  function renderImagesSection() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Todas as Imagens</CardTitle>
              <CardDescription>{images?.length ?? 0} imagens carregadas</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg"
                multiple
                className="hidden"
                onChange={handleUpload}
                data-testid="input-file-upload"
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload"
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? "A enviar..." : "Upload JPEG"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !images || images.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Nenhuma imagem carregada</p>
              <p className="text-sm text-muted-foreground">Carregue imagens JPEG (max 200KB) usando o botao acima.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Preview</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Tamanho</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    {isMaster && <TableHead>Likes</TableHead>}
                    <TableHead className="w-[100px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((image) => (
                    <TableRow key={image.id} data-testid={`row-image-${image.id}`}>
                      <TableCell>
                        <img src={`/uploads/${image.filename}`} alt={image.originalName} className="h-10 w-10 object-cover rounded-md" data-testid={`img-preview-${image.id}`} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm truncate max-w-[200px]" data-testid={`text-name-${image.id}`}>{image.originalName}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{(image.size / 1024).toFixed(1)} KB</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{(image.size / 1024).toFixed(1)} KB</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(image.createdAt).toLocaleDateString("pt-PT")}
                        </div>
                      </TableCell>
                      {isMaster && (
                        <TableCell>
                          <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setLikesDialog(image.id)} data-testid={`button-view-likes-${image.id}`}>
                            <Heart className="h-3.5 w-3.5" />
                            <span>{image.likeCount}</span>
                          </Button>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <a href={`/uploads/${image.filename}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" data-testid={`button-view-${image.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(image.id)} data-testid={`button-delete-${image.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderAdminsSection() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Administradores</CardTitle>
              <CardDescription>Gerir contas de administrador</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddAdminDialog(true)} data-testid="button-add-admin">
              <UserPlus className="h-4 w-4 mr-1" />
              Adicionar Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!adminList || adminList.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhum administrador encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Funcao</TableHead>
                    <TableHead className="w-[120px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminList.map((admin) => (
                    <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Avatar className="h-8 w-8">
                            {admin.profilePicture && (
                              <AvatarImage src={`/uploads/${admin.profilePicture}`} alt={admin.username} />
                            )}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                              {admin.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm" data-testid={`text-admin-name-${admin.id}`}>{admin.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {admin.role === "master" ? (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <ShieldCheck className="h-3 w-3" />
                            Master
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.role !== "master" && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditAdminDialog(admin); setEditAdminUsername(admin.username); setEditAdminPassword(""); }} data-testid={`button-edit-admin-${admin.id}`}>
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteAdminDialog(admin)} data-testid={`button-delete-admin-${admin.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderReportsSection() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Relatorios Diarios</CardTitle>
              <CardDescription>Relatorios gerados automaticamente as 23:59:58</CardDescription>
            </div>
            <Button size="sm" onClick={() => generateReportMutation.mutate()} disabled={generateReportMutation.isPending} data-testid="button-generate-report">
              <FileText className="h-4 w-4 mr-1" />
              {generateReportMutation.isPending ? "A gerar..." : "Gerar Agora"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum relatorio disponivel. Clique em "Gerar Agora" ou aguarde a geracao automatica.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ficheiro</TableHead>
                    <TableHead className="w-[100px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((filename) => (
                    <TableRow key={filename} data-testid={`row-report-${filename}`}>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium" data-testid={`text-report-name-${filename}`}>{filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewReport(filename)} data-testid={`button-view-report-${filename}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderDialogs() {
    return (
      <>
        <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Imagem</DialogTitle>
              <DialogDescription>Tem a certeza que deseja eliminar esta imagem? Esta acao nao pode ser revertida.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setDeleteDialog(null)} data-testid="button-cancel-delete">Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
                {deleteMutation.isPending ? "A eliminar..." : "Eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!likesDialog} onOpenChange={() => setLikesDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Likes desta Imagem
              </DialogTitle>
              <DialogDescription>Lista de emails que deram like nesta imagem.</DialogDescription>
            </DialogHeader>
            {!likes || likes.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum like registado ainda.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Data / Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {likes.map((like) => (
                      <TableRow key={like.id} data-testid={`row-like-${like.id}`}>
                        <TableCell className="text-sm" data-testid={`text-like-email-${like.id}`}>{like.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(like.createdAt).toLocaleString("pt-PT")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Definicoes do Perfil
              </DialogTitle>
              <DialogDescription>Altere o seu nome de usuario, senha ou foto de perfil.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20">
                  {session?.admin.profilePicture && (
                    <AvatarImage src={`/uploads/${session.admin.profilePicture}`} alt={session.admin.username} />
                  )}
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                    {session?.admin.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input ref={profilePicInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} data-testid="input-profile-picture" />
                <div className="flex items-center flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => profilePicInputRef.current?.click()} disabled={profilePicMutation.isPending} data-testid="button-change-profile-pic">
                    <Camera className="h-3.5 w-3.5 mr-1" />
                    {profilePicMutation.isPending ? "A enviar..." : "Alterar Foto"}
                  </Button>
                  {session?.admin.profilePicture && (
                    <Button variant="ghost" size="sm" onClick={() => removeProfilePicMutation.mutate()} disabled={removeProfilePicMutation.isPending} data-testid="button-remove-profile-pic">
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-username">Nome de Usuario</Label>
                  <Input id="profile-username" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} placeholder="Nome de usuario" data-testid="input-profile-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Necessaria para alterar a senha" data-testid="input-current-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe vazio para manter" data-testid="input-new-password" />
                </div>
              </div>
              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setProfileDialog(false)} data-testid="button-cancel-profile">Cancelar</Button>
                <Button onClick={handleProfileSave} disabled={profileMutation.isPending} data-testid="button-save-profile">
                  {profileMutation.isPending ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addAdminDialog} onOpenChange={setAddAdminDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar Administrador
              </DialogTitle>
              <DialogDescription>Crie uma nova conta de administrador.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-admin-username">Nome de Usuario</Label>
                <Input id="new-admin-username" value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} placeholder="Nome de usuario" data-testid="input-new-admin-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-admin-password">Senha</Label>
                <Input id="new-admin-password" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Senha (min 4 caracteres)" data-testid="input-new-admin-password" />
              </div>
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setAddAdminDialog(false)} data-testid="button-cancel-add-admin">Cancelar</Button>
              <Button onClick={() => addAdminMutation.mutate({ username: newAdminUsername, password: newAdminPassword })} disabled={addAdminMutation.isPending || !newAdminUsername || !newAdminPassword} data-testid="button-confirm-add-admin">
                {addAdminMutation.isPending ? "A criar..." : "Criar Admin"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editAdminDialog} onOpenChange={() => setEditAdminDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Editar Administrador
              </DialogTitle>
              <DialogDescription>Alterar username ou senha de "{editAdminDialog?.username}".</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-admin-username">Nome de Usuario</Label>
                <Input id="edit-admin-username" value={editAdminUsername} onChange={(e) => setEditAdminUsername(e.target.value)} data-testid="input-edit-admin-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-admin-password">Nova Senha</Label>
                <Input id="edit-admin-password" type="password" value={editAdminPassword} onChange={(e) => setEditAdminPassword(e.target.value)} placeholder="Deixe vazio para manter" data-testid="input-edit-admin-password" />
              </div>
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setEditAdminDialog(null)} data-testid="button-cancel-edit-admin">Cancelar</Button>
              <Button onClick={() => {
                if (!editAdminDialog) return;
                const data: { username?: string; password?: string } = {};
                if (editAdminUsername && editAdminUsername !== editAdminDialog.username) data.username = editAdminUsername;
                if (editAdminPassword) data.password = editAdminPassword;
                if (Object.keys(data).length === 0) { toast({ title: "Sem alteracoes" }); return; }
                editAdminMutation.mutate({ id: editAdminDialog.id, data });
              }} disabled={editAdminMutation.isPending} data-testid="button-confirm-edit-admin">
                {editAdminMutation.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteAdminDialog} onOpenChange={() => setDeleteAdminDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Administrador</DialogTitle>
              <DialogDescription>Tem a certeza que deseja eliminar o administrador "{deleteAdminDialog?.username}"?</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setDeleteAdminDialog(null)} data-testid="button-cancel-delete-admin">Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteAdminDialog && deleteAdminMutation.mutate(deleteAdminDialog.id)} disabled={deleteAdminMutation.isPending} data-testid="button-confirm-delete-admin">
                {deleteAdminMutation.isPending ? "A eliminar..." : "Eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!reportDialog} onOpenChange={() => setReportDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {reportDialog?.filename}
              </DialogTitle>
              <DialogDescription>Conteudo do relatorio</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh]">
              <pre className="text-xs font-mono bg-muted p-4 rounded-md whitespace-pre-wrap" data-testid="text-report-content">
                {reportDialog?.content}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
