import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Camera, ArrowLeft } from "lucide-react";
import { useLocation, Link } from "wouter";

export default function AdminLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: () => {
      setLocation("/admin/dashboard");
    },
    onError: () => {
      toast({
        title: "Erro de autenticacao",
        description: "Username ou password incorretos.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-3 border-b">
        <Link href="/" data-testid="link-back-gallery">
          <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-back-gallery">
            <ArrowLeft className="h-4 w-4" />
            Voltar a Galeria
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center flex-wrap mb-8">
            <div className="h-16 w-16 rounded-md bg-primary flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Galeria Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acesso restrito a administradores
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Insira o username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Insira a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  <Lock className="h-4 w-4 mr-1.5" />
                  {loginMutation.isPending ? "A autenticar..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
