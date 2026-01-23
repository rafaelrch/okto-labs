import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

const ROLES = [
  'Social Media',
  'Editor de Vídeo',
  'Designer',
  'Coordenador(a)',
  'Logística',
  'RH',
  'Filmmaker',
  'Diretoria',
];

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupRole, setSignupRole] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        let message = 'Ocorreu um erro ao fazer login.';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Por favor, confirme seu email antes de fazer login.';
        }
        
        toast({
          title: 'Erro no login',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        toast({
          title: 'Bem-vindo(a)!',
          description: `Login realizado com sucesso!`,
        });
        navigate('/');
      }
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

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      // Validations
      if (!firstName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (signupPassword.length < 8) {
        toast({
          title: 'Senha fraca',
          description: 'A senha deve ter pelo menos 8 caracteres.',
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

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: fullName,
            phone: signupPhone.trim(),
            role: signupRole.trim() || 'Funcionário',
          },
        },
      });

      if (error) {
        console.error('[Auth] Erro no cadastro:', error);
        let message = 'Ocorreu um erro ao criar a conta.';
        
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          message = 'Este email já está cadastrado. Tente fazer login.';
        } else if (error.message.includes('Password should be at least')) {
          message = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (error.message.includes('Invalid email')) {
          message = 'Email inválido.';
        } else if (error.message.includes('Signups not allowed')) {
          message = 'Cadastros estão desabilitados. Contate o administrador.';
        } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          message = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        } else {
          // Mostrar erro real para debug
          message = `Erro: ${error.message}`;
        }
        
        toast({
          title: 'Erro no cadastro',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        // Create employee record with phone
        try {
          await supabase.from('employees').upsert({
            user_id: data.user.id,
            name: fullName,
            email: signupEmail.trim().toLowerCase(),
            phone: signupPhone.trim() || null,
            role: signupRole.trim() || 'Funcionário',
            status: 'active',
          }, {
            onConflict: 'user_id',
          });
        } catch (empError) {
          console.error('Erro ao criar funcionário:', empError);
        }

        // Check if email confirmation is required
        if (data.session) {
          toast({
            title: 'Conta criada com sucesso!',
            description: `Bem-vindo(a), ${firstName}!`,
          });
          navigate('/');
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Verifique seu email para confirmar a conta.',
          });
        }
      }
    } catch (error: any) {
      console.error('[Auth] Erro geral no cadastro:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Ocorreu um erro ao criar a conta.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">
      {/* Left Side - Gradient & Info */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-3xl m-4">
        {/* Dark Background */}
        <div className="absolute inset-0 bg-[#0d0d0d]" />
        
        {/* Purple Gradient Glow - Top Center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[500px] h-[500px]">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/60 via-fuchsia-500/40 to-transparent rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400/50 via-purple-600/30 to-transparent rounded-full blur-[80px]" />
        </div>
        
        {/* Secondary Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-b from-fuchsia-400/40 via-purple-500/20 to-transparent rounded-full blur-[60px]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end p-12 w-full">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <img 
              src="/LOGO-LABS.png" 
              alt="Okto Lab" 
              className="h-12 w-auto object-contain"
            />
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4">
            {isLogin ? 'Bem-vindo de volta' : 'Comece Agora'}
          </h1>
          <p className="text-white/70 text-lg mb-12">
            {isLogin 
              ? 'Acesse sua conta para continuar.' 
              : 'Complete esses passos simples para registrar sua conta.'}
          </p>
          
          {/* Steps */}
          {!isLogin && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-lg">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <span className="text-black font-medium">Crie sua conta</span>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="w-8 h-8 rounded-full border border-white/30 text-white/50 flex items-center justify-center font-medium text-sm">
                  2
                </div>
                <span className="text-white/50">Configure seu workspace</span>
              </div>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="w-8 h-8 rounded-full border border-white/30 text-white/50 flex items-center justify-center font-medium text-sm">
                  3
                </div>
                <span className="text-white/50">Complete seu perfil</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/LOGO-LABS.png" 
              alt="Okto Lab" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {isLogin ? 'Acessar Conta' : 'Criar Conta'}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {isLogin 
              ? 'Entre com suas credenciais para acessar.' 
              : 'Preencha seus dados para criar sua conta.'}
          </p>

          {isLogin ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-300">Senha</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 pr-12 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-gray-200 h-12 font-semibold mt-6"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-gray-300">Nome</Label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="ex. João"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-gray-300">Sobrenome</Label>
                  <Input
                    id="last-name"
                    type="text"
                    placeholder="ex. Silva"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ex. joao@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="text-gray-300">Telefone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-role" className="text-gray-300">Cargo</Label>
                <Select value={signupRole} onValueChange={setSignupRole}>
                  <SelectTrigger className="bg-[#202020] border-0 text-white h-12 rounded-xl">
                    <SelectValue placeholder="Selecione seu cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-300">Senha</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="bg-[#202020] border-0 text-white placeholder:text-gray-500 h-12 pr-12 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-gray-500 text-sm">Deve ter pelo menos 8 caracteres.</p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-gray-200 h-12 font-semibold mt-2"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
          )}

          {/* Toggle Login/Signup */}
          <p className="text-center text-gray-400 mt-6">
            {isLogin ? (
              <>
                Não tem uma conta?{' '}
                <button 
                  onClick={() => setIsLogin(false)} 
                  className="text-white font-semibold hover:underline"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem uma conta?{' '}
                <button 
                  onClick={() => setIsLogin(true)} 
                  className="text-white font-semibold hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
