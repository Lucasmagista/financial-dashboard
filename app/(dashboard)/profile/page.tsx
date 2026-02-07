'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, Shield, Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  accounts_count: number;
  transactions_count: number;
  budgets_count: number;
  goals_count: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }
      if (!response.ok) throw new Error('Erro ao carregar perfil');

      const data = await response.json();
      setUserData(data.user);
      setUserStats(data.stats);
      setName(data.user.name || '');
      setEmail(data.user.email || '');
      setPhone(data.user.phone || '');
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados do perfil',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || null }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar perfil');
      }

      const data = await response.json();
      setUserData(data.user);

      toast({
        title: 'Sucesso!',
        description: 'Perfil atualizado com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar perfil',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não conferem',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A nova senha deve ter no mínimo 8 caracteres',
      });
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao alterar senha');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: 'Sucesso!',
        description: 'Senha alterada com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao alterar senha',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um arquivo de imagem válido',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar foto');
      }

      const data = await response.json();
      setUserData((prev) => (prev ? { ...prev, avatar_url: data.avatarUrl } : null));

      toast({
        title: 'Sucesso!',
        description: 'Foto de perfil atualizada.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar foto',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword, confirmation: 'DELETE' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir conta');
      }

      toast({
        title: 'Conta excluída',
        description: 'Sua conta foi excluída permanentemente.',
      });

      router.push('/auth/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir conta',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Não foi possível carregar o perfil</p>
          <Button onClick={loadUserData} className="mt-4">
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userData.avatar_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {userData.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <h2 className="text-xl font-bold mt-4">{userData.name}</h2>
              <p className="text-sm text-muted-foreground">{userData.email}</p>

              <div className="flex items-center gap-2 mt-3">
                {userData.is_email_verified ? (
                  <Badge variant="default" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Verificado
                  </Badge>
                ) : (
                  <Badge variant="secondary">Não verificado</Badge>
                )}
              </div>

              {userStats && (
                <div className="w-full mt-6 pt-6 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{userStats.accounts_count}</p>
                      <p className="text-xs text-muted-foreground">Contas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.transactions_count}</p>
                      <p className="text-xs text-muted-foreground">Transações</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.budgets_count}</p>
                      <p className="text-xs text-muted-foreground">Orçamentos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.goals_count}</p>
                      <p className="text-xs text-muted-foreground">Metas</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Informações da Conta
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Membro desde</p>
                <p className="font-medium">
                  {new Date(userData.created_at).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Última atualização</p>
                <p className="font-medium">
                  {new Date(userData.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Informações Pessoais</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={loadUserData} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Segurança</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={savingPassword}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Atualizar Senha'
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6 border-destructive/50">
            <h3 className="text-lg font-semibold mb-4 text-destructive">Zona de Perigo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ações irreversíveis que afetam permanentemente sua conta
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delete-password">Digite sua senha para confirmar</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Sua senha"
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={!deletePassword}
              >
                Excluir Minha Conta
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir conta permanentemente?"
        description="Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente, incluindo contas, transações, orçamentos e metas."
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
