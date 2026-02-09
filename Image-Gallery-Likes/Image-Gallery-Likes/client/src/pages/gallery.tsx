import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, Camera, X, Grid3X3, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { ImageWithLikes } from "@shared/schema";

function ImageSkeleton() {
  return (
    <Card className="overflow-visible">
      <CardContent className="p-0">
        <div className="flex items-center flex-wrap gap-3 p-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-full aspect-square" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

export default function Gallery() {
  const { toast } = useToast();
  const [likeDialogOpen, setLikeDialogOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [lightboxImage, setLightboxImage] = useState<ImageWithLikes | null>(null);

  const { data: images, isLoading } = useQuery<ImageWithLikes[]>({
    queryKey: ["/api/images"],
  });

  const likeMutation = useMutation({
    mutationFn: async ({ imageId, email }: { imageId: string; email: string }) => {
      const res = await apiRequest("POST", `/api/images/${imageId}/like`, { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      setLikeDialogOpen(false);
      setEmail("");
      setSelectedImageId(null);
      toast({ title: "Like registado!", description: "O seu like foi registado com sucesso." });
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes("ja deu like") || msg.includes("already liked")) {
        toast({ title: "Ja deu like", description: "Este email ja deu like. Cada email so pode dar 1 like.", variant: "destructive" });
      } else if (msg.includes("deve conter @") || msg.includes("Invalid email")) {
        toast({ title: "Email invalido", description: "O email deve conter @", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Ocorreu um erro ao registar o like.", variant: "destructive" });
      }
    },
  });

  const handleLikeClick = (imageId: string) => {
    setSelectedImageId(imageId);
    setLikeDialogOpen(true);
  };

  const handleLikeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImageId || !email) return;
    likeMutation.mutate({ imageId: selectedImageId, email });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center flex-wrap gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-gallery-title">Galeria</h1>
          </div>
          <Link href="/admin" data-testid="link-admin">
            <Button variant="ghost" size="sm" data-testid="button-admin-login">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto border-x min-h-[calc(100vh-53px)]">
        <div className="flex items-center flex-wrap gap-3 px-4 py-3 border-b">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground" data-testid="text-feed-label">Feed</span>
          <div className="flex-1" />
          <div className="flex items-center flex-wrap gap-1">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground" data-testid="text-photo-count">{images?.length ?? 0} fotos</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <ImageSkeleton key={i} />
            ))}
          </div>
        ) : !images || images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-5">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">
              Nenhuma publicacao ainda
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              As imagens aparecerão aqui assim que forem adicionadas pelos administradores.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {images.map((image) => (
              <div key={image.id} data-testid={`card-image-${image.id}`}>
                <div className="flex items-center flex-wrap gap-3 px-4 py-3">
                  <Avatar className="h-9 w-9">
                    {image.uploaderProfilePicture && (
                      <AvatarImage src={`/uploads/${image.uploaderProfilePicture}`} alt={image.uploaderUsername || "admin"} />
                    )}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {(image.uploaderUsername || "A").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" data-testid={`text-image-author-${image.id}`}>
                      {image.uploaderUsername || "admin"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(new Date(image.createdAt))}
                    </p>
                  </div>
                </div>

                <div
                  className="relative cursor-pointer bg-muted/30"
                  onClick={() => setLightboxImage(image)}
                  data-testid={`image-click-${image.id}`}
                >
                  <img
                    src={`/uploads/${image.filename}`}
                    alt={image.originalName}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                    data-testid={`img-${image.id}`}
                  />
                </div>

                <div className="px-4 py-2">
                  <div className="flex items-center flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLikeClick(image.id)}
                      data-testid={`button-like-${image.id}`}
                    >
                      <Heart className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-sm font-semibold mt-1" data-testid={`text-like-count-${image.id}`}>
                    {image.likeCount} {image.likeCount === 1 ? "like" : "likes"}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">{image.uploaderUsername || "admin"}</span>{" "}
                    <span className="text-muted-foreground" data-testid={`text-image-name-${image.id}`}>{image.originalName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">
                    {new Date(image.createdAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={likeDialogOpen} onOpenChange={setLikeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Like</DialogTitle>
            <DialogDescription>
              Insira o seu email para dar like. Cada email so pode dar 1 like no total.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLikeSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-like-email"
            />
            <div className="flex justify-end gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLikeDialogOpen(false)}
                data-testid="button-cancel-like"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={likeMutation.isPending}
                data-testid="button-submit-like"
              >
                {likeMutation.isPending ? "A enviar..." : "Confirmar Like"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{lightboxImage?.originalName}</DialogTitle>
            <DialogDescription>Imagem em tamanho completo</DialogDescription>
          </DialogHeader>
          {lightboxImage && (
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur"
                onClick={() => setLightboxImage(null)}
                data-testid="button-close-lightbox"
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={`/uploads/${lightboxImage.filename}`}
                alt={lightboxImage.originalName}
                className="w-full h-auto max-h-[80vh] object-contain"
                data-testid="img-lightbox"
              />
              <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium" data-testid="text-lightbox-name">{lightboxImage.originalName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(lightboxImage.createdAt).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={() => {
                    setLightboxImage(null);
                    handleLikeClick(lightboxImage.id);
                  }}
                  data-testid="button-lightbox-like"
                >
                  <Heart className="h-4 w-4" />
                  <span>{lightboxImage.likeCount} likes</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
