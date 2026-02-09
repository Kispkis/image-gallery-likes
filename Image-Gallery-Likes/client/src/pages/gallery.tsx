import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Heart, Camera, X } from "lucide-react";
import { Link } from "wouter";
import type { ImageWithLikes } from "@shared/schema";

function ImageSkeleton() {
  return (
    <Card className="overflow-visible">
      <CardContent className="p-0">
        <Skeleton className="w-full aspect-square rounded-t-md" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold sm:text-2xl">Galeria</h1>
          </div>
          <Link href="/admin" data-testid="link-admin">
            <Button variant="outline" size="sm" data-testid="button-admin-login">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ImageSkeleton key={i} />
            ))}
          </div>
        ) : !images || images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Camera className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Nenhuma imagem disponivel
            </h2>
            <p className="text-sm text-muted-foreground">
              As imagens aparecerão aqui assim que forem adicionadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-visible group" data-testid={`card-image-${image.id}`}>
                <CardContent className="p-0">
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setLightboxImage(image)}
                    data-testid={`image-click-${image.id}`}
                  >
                    <img
                      src={`/uploads/${image.filename}`}
                      alt={image.originalName}
                      className="w-full aspect-square object-cover rounded-t-md"
                      loading="lazy"
                      data-testid={`img-${image.id}`}
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground truncate max-w-[60%]" data-testid={`text-image-name-${image.id}`}>
                      {image.originalName}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleLikeClick(image.id)}
                      data-testid={`button-like-${image.id}`}
                    >
                      <Heart className="h-4 w-4" />
                      <span data-testid={`text-like-count-${image.id}`}>{image.likeCount}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

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
                variant="ghost"
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
              <div className="p-4 flex items-center justify-between gap-2 flex-wrap">
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
