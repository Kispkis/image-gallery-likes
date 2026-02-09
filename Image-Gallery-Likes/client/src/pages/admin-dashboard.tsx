import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, LogOut, Camera, Image as ImageIcon, Heart, Eye } from "lucide-react";
import { useLocation, Link } from "wouter";
import type { ImageWithLikes, Like } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [likesDialog, setLikesDialog] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useQuery<{ admin: { id: string; username: string } } | null>({
    queryKey: ["/api/auth/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

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

  const totalLikes = images?.reduce((sum, img) => sum + img.likeCount, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold sm:text-2xl">Painel Admin</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="text-admin-username">
              {session.admin.username}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Imagens</p>
                <p className="text-2xl font-bold" data-testid="text-total-images">{images?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Likes</p>
                <p className="text-2xl font-bold" data-testid="text-total-likes">{totalLikes}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Carregar</p>
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
                  {uploading ? "A enviar..." : "Selecionar JPEG"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Apenas ficheiros JPEG. Tamanho maximo: 200KB por imagem.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Imagens</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !images || images.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma imagem carregada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Carregue imagens JPEG usando o botao acima.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Tamanho</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {images.map((image) => (
                      <TableRow key={image.id} data-testid={`row-image-${image.id}`}>
                        <TableCell>
                          <img
                            src={`/uploads/${image.filename}`}
                            alt={image.originalName}
                            className="h-12 w-12 object-cover rounded-md"
                            data-testid={`img-preview-${image.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate" data-testid={`text-name-${image.id}`}>
                          {image.originalName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {(image.size / 1024).toFixed(1)} KB
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(image.createdAt).toLocaleDateString("pt-PT")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => setLikesDialog(image.id)}
                            data-testid={`button-view-likes-${image.id}`}
                          >
                            <Heart className="h-4 w-4" />
                            <span>{image.likeCount}</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <a href={`/uploads/${image.filename}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" data-testid={`button-view-${image.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDialog(image.id)}
                              data-testid={`button-delete-${image.id}`}
                            >
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

        <div className="text-center pb-4">
          <Link href="/" className="text-sm text-muted-foreground hover:underline" data-testid="link-view-gallery">
            Ver Galeria Publica
          </Link>
        </div>
      </main>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Imagem</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar esta imagem? Esta acao nao pode ser revertida e todos os likes associados serao removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} data-testid="button-cancel-delete">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "A eliminar..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!likesDialog} onOpenChange={() => setLikesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Likes desta Imagem</DialogTitle>
            <DialogDescription>
              Lista de emails que deram like nesta imagem.
            </DialogDescription>
          </DialogHeader>
          {!likes || likes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum like registado ainda.
            </p>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(like.createdAt).toLocaleString("pt-PT")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
