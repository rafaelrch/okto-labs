import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getFromStorage, saveToStorage, generateId, Employee } from '@/lib/storage';
import { Mail, Lock, User, Phone, Briefcase } from 'lucide-react';

interface AuthEmployee extends Employee {
  password: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupRole, setSignupRole] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const employees = getFromStorage<AuthEmployee>('employees');
      const employee = employees.find(
        (emp) => emp.email.toLowerCase() === loginEmail.toLowerCase()
      );

      if (!employee) {
        toast({
          title: 'Erro no login',
          description: 'Email não encontrado.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Check password (stored employees without password use email as default)
      const validPassword = employee.password 
        ? employee.password === loginPassword 
        : loginPassword === employee.email;

      if (!validPassword) {
        toast({
          title: 'Erro no login',
          description: 'Senha incorreta.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (employee.status === 'inactive') {
        toast({
          title: 'Acesso negado',
          description: 'Sua conta está desativada. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Save session
      localStorage.setItem('agency_session', JSON.stringify({
        employeeId: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        loggedInAt: new Date().toISOString(),
      }));

      toast({
        title: 'Bem-vindo(a)!',
        description: `Olá, ${employee.name.split(' ')[0]}!`,
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao fazer login.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validations
      if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (signupPassword.length < 6) {
        toast({
          title: 'Senha fraca',
          description: 'A senha deve ter pelo menos 6 caracteres.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (signupPassword !== signupConfirmPassword) {
        toast({
          title: 'Senhas não conferem',
          description: 'A senha e a confirmação devem ser iguais.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signupEmail)) {
        toast({
          title: 'Email inválido',
          description: 'Por favor, insira um email válido.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const employees = getFromStorage<AuthEmployee>('employees');
      const existingEmployee = employees.find(
        (emp) => emp.email.toLowerCase() === signupEmail.toLowerCase()
      );

      if (existingEmployee) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já está em uso. Tente fazer login.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Create new employee
      const newEmployee: AuthEmployee = {
        id: generateId(),
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        phone: signupPhone.trim(),
        role: signupRole.trim() || 'Funcionário',
        avatar: '',
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
        skills: [],
        createdAt: new Date().toISOString(),
        password: signupPassword,
      };

      employees.push(newEmployee);
      saveToStorage('employees', employees);

      // Auto login after signup
      localStorage.setItem('agency_session', JSON.stringify({
        employeeId: newEmployee.id,
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
        loggedInAt: new Date().toISOString(),
      }));

      toast({
        title: 'Conta criada com sucesso!',
        description: `Bem-vindo(a), ${newEmployee.name.split(' ')[0]}!`,
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao criar a conta.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Agência Digital</h1>
          <p className="text-muted-foreground">Sistema de Gerenciamento Interno</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">Acesse sua conta</CardTitle>
            <CardDescription className="text-center">
              Entre ou crie uma nova conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Dica:</strong> Para funcionários existentes sem senha cadastrada, use o email como senha.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-role">Cargo</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-role"
                          type="text"
                          placeholder="Ex: Designer"
                          value={signupRole}
                          onChange={(e) => setSignupRole(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Repita a senha"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
