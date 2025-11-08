// app/login.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext'; // <- NOSSO NOVO HOOK

export default function LoginScreen() {
  // const router = useRouter(); // Não precisamos mais disto aqui
  const { signIn } = useAuth(); // <- PEGA A FUNÇÃO DO CONTEXTO
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [showResendPrompt, setShowResendPrompt] = useState(false);

  // --- Carregar credenciais salvas ao montar o componente ---
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('@saved_email');
      const savedPassword = await AsyncStorage.getItem('@saved_password');
      const savedRememberMe = await AsyncStorage.getItem('@remember_me');

      if (savedRememberMe === 'true' && savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.log('Erro ao carregar credenciais salvas:', error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const saveCredentials = async (email: string, password: string, remember: boolean) => {
    try {
      if (remember) {
        await AsyncStorage.setItem('@saved_email', email);
        await AsyncStorage.setItem('@saved_password', password);
        await AsyncStorage.setItem('@remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('@saved_email');
        await AsyncStorage.removeItem('@saved_password');
        await AsyncStorage.removeItem('@remember_me');
      }
    } catch (error) {
      console.log('Erro ao salvar credenciais:', error);
    }
  };

  // --- Suas Animações (mantidas 100%) ---
  const [floatingAnim] = useState(new Animated.Value(0));
  const [bounceAnim1] = useState(new Animated.Value(0));
  const [bounceAnim2] = useState(new Animated.Value(0));
  const [bounceAnim3] = useState(new Animated.Value(0));

  React.useEffect(() => {
    // Floating animation for main logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Bounce animations for decorative elements
    const createBounce = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createBounce(bounceAnim1, 0);
    createBounce(bounceAnim2, 300);
    createBounce(bounceAnim3, 600);
  }, []);

  const translateY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  // --- Fim das Animações ---


  // --- NOVA FUNÇÃO handleLogin ---
  async function handleLogin() {
    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Toda a lógica complexa de JWT, busca de usuário,
      // busca de escolas e redirecionamento
      // está agora DENTRO da função 'signIn'.
      // A tela não sabe de nada, ela só chama.
      await signIn(email, password);

      // Salvar ou remover credenciais baseado no "Lembrar de mim"
      await saveCredentials(email, password, rememberMe);

      // O redirecionamento será tratado pelo AuthContext
      // Não precisamos mais do 'router.replace' aqui.

    } catch (e: any) {
      // Log detalhado para desenvolvedor
      console.log('Login error:', e);

      const status = e?.response?.status;
      const serverData = e?.response?.data;

      // Extrair mensagem bruta do servidor de forma segura
      let rawMsg = '';
      try {
        if (typeof serverData === 'string') rawMsg = serverData;
        else if (serverData && typeof serverData === 'object') rawMsg = serverData.message || serverData.error || JSON.stringify(serverData);
        else rawMsg = e?.message || '';
      } catch (ex) {
        rawMsg = String(serverData);
      }

      // Mapear para mensagens amigáveis ao usuário
      let friendly = 'Erro ao fazer login. Tente novamente.';
      if (status === 400 || status === 401) {
        friendly = 'E-mail ou senha incorretos.';
      } else if (status === 403) {
        // Verificação de e-mail não realizada
        if (rawMsg.toLowerCase().includes('verific') || rawMsg.toLowerCase().includes('verificado')) {
          friendly = 'E-mail não verificado. Verifique seu e-mail antes de acessar o sistema.';
          setShowResendPrompt(true);
        } else {
          friendly = 'Acesso negado.';
        }
      } else if (status === 422) {
        friendly = 'Dados inválidos. Verifique e tente novamente.';
      } else if (status >= 500) {
        friendly = 'Erro no servidor. Tente novamente mais tarde.';
      }

      // Não exibir mensagens muito longas ou técnicas para o usuário
      setError(friendly);

      // Ainda assim, deixar o detalhe nos logs para depuração
      console.debug('Server login raw message (for debugging):', rawMsg);
    } finally {
      setIsLoading(false);
    }
  }

  async function resendVerificationEmail(emailAddress: string) {
    if (!emailAddress) {
      toast.showToast('Informe seu e-mail antes de reenviar o código.', 'warning');
      return;
    }

    try {
      await api.post('/auth/resend-verification', { email: emailAddress });
      toast.success('E-mail de verificação enviado. Cheque sua caixa de entrada.');
      setShowResendPrompt(false);
    } catch (err: any) {
      console.log('Erro ao reenviar verificação:', err);
      const status = err?.response?.status;
      let friendly = 'Erro ao reenviar verificação. Tente novamente mais tarde.';
      if (status === 404) friendly = 'E-mail não encontrado.';
      else if (status === 429) friendly = 'Muitas tentativas. Aguarde e tente novamente.';
      // preserve a short debug log but avoid showing raw server dumps to user
      toast.error(friendly);
    }
  }

  // Mostrar loading enquanto carrega as credenciais salvas
  if (isLoadingCredentials) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{ marginTop: 16, color: '#6B7280', fontSize: 14 }}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Make toast available on the login screen so messages from useToast are visible */}
      <Toast visible={toast.toast.visible} message={toast.toast.message} type={toast.toast.type} onHide={toast.hideToast} />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.content}>
        {/* --- Seu Design (mantido 100%) --- */}
        {/* Decorative Background Elements */}
        <View style={styles.decorativeContainer}>
           <Animated.View 
             style={[
               styles.floatingIcon, 
               styles.floatingIcon1,
               { transform: [{ translateY: bounceAnim1 }] }
             ]}
           >
             <Ionicons name="color-palette" size={32} color="#FDE68A" />
           </Animated.View>
           <Animated.View 
             style={[
               styles.floatingIcon, 
               styles.floatingIcon2,
               { transform: [{ translateY: bounceAnim2 }] }
             ]}
           >
             <MaterialCommunityIcons name="music-note" size={28} color="#FBCFE8" />
           </Animated.View>
           <Animated.View 
             style={[
               styles.floatingIcon, 
               styles.floatingIcon3,
               { transform: [{ translateY: bounceAnim3 }] }
             ]}
           >
             <Ionicons name="star" size={30} color="#BFDBFE" />
           </Animated.View>
           
           <View style={[styles.circle, styles.circle1]} />
           <View style={[styles.circle, styles.circle2]} />
           <View style={[styles.circle, styles.circle3]} />
           <View style={[styles.circle, styles.circle4]} />
         </View>
 
         {/* Header Section */}
         <View style={styles.header}>
           <Animated.View style={[styles.logoContainer, { transform: [{ translateY }] }]}>
             <View style={styles.bookIcon}>
               <MaterialCommunityIcons name="book-open-page-variant" size={48} color="#8B5CF6" />
               <View style={styles.starBadge}>
                 <Ionicons name="star" size={16} color="#F59E0B" />
               </View>
               <View style={styles.heartBadge}>
                 <Ionicons name="heart" size={16} color="#EC4899" />
               </View>
               <View style={styles.paletteBadge}>
                 <Ionicons name="color-palette" size={14} color="#3B82F6" />
               </View>
             </View>
           </Animated.View>

           <Text style={styles.greeting}>Olá, Educador!</Text>

           <Text style={styles.subtitle}>Registre o desenvolvimento das crianças</Text>
 
           {/* Decorative Dots */}
           <View style={styles.dotsContainer}>
             <View style={[styles.dot, styles.dotYellow]} />
             <View style={[styles.dot, styles.dotPink]} />
             <View style={[styles.dot, styles.dotPurple]} />
             <View style={[styles.dot, styles.dotBlue]} />
             <View style={[styles.dot, styles.dotGreen]} />
           </View>
         </View>
 
         {/* Login Card */}
         <View style={styles.card}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {showResendPrompt && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity style={{ marginBottom: 12 }} onPress={() => resendVerificationEmail(email)}>
                <Text style={{ color: '#8B5CF6', fontWeight: '700' }}>Reenviar e-mail de verificação</Text>
              </TouchableOpacity>
            </View>
          )}
 
           {/* Email Input */}
           <View style={styles.inputGroup}>
             <View style={styles.labelContainer}>
               <Ionicons name="mail" size={16} color="#6B7280" />
               <Text style={styles.label}>E-mail</Text>
             </View>
             <View style={styles.inputWrapper}>
               <Ionicons 
                 name="mail-outline" 
                 size={20} 
                 color="#9CA3AF" 
                 style={styles.inputIcon}
               />
               <TextInput
                 style={styles.input}
                 placeholder="seu@email.com"
                 placeholderTextColor="#9CA3AF"
                 value={email}
                 onChangeText={setEmail}
                 keyboardType="email-address"
                 autoCapitalize="none"
                 autoComplete="email"
                 editable={!isLoading}
               />
             </View>
           </View>
 
           {/* Password Input */}
           <View style={styles.inputGroup}>
             <View style={styles.labelContainer}>
               <Ionicons name="lock-closed" size={16} color="#6B7280" />
               <Text style={styles.label}>Senha</Text>
             </View>
             <View style={styles.inputWrapper}>
               <Ionicons 
                 name="lock-closed-outline" 
                 size={20} 
                 color="#9CA3AF" 
                 style={styles.inputIcon}
               />
               <TextInput
                 style={styles.passwordInput}
                 placeholder="••••••••"
                 placeholderTextColor="#9CA3AF"
                 value={password}
                 onChangeText={setPassword}
                 secureTextEntry={!showPassword}
                 autoCapitalize="none"
                 editable={!isLoading}
               />
               <TouchableOpacity
                 style={styles.eyeButton}
                 onPress={() => setShowPassword(!showPassword)}
               >
                 <Ionicons 
                   name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                   size={22} 
                   color="#6B7280" 
                 />
               </TouchableOpacity>
             </View>
           </View>
 
           {/* Remember Me & Forgot Password */}
           <View style={styles.optionsRow}>
             <TouchableOpacity
               style={styles.rememberMe}
               onPress={async () => {
                 const newValue = !rememberMe;
                 setRememberMe(newValue);
                 // Se desmarcar, limpar credenciais salvas imediatamente
                 if (!newValue) {
                   await saveCredentials('', '', false);
                 }
               }}
             >
               <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                 {rememberMe && (
                   <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                 )}
               </View>
               <Text style={styles.rememberText}>Lembrar de mim</Text>
             </TouchableOpacity>
 
             <TouchableOpacity style={styles.forgotButton} onPress={() => router.push('/forgot-password')}>
               <Text style={styles.forgotPassword}>Esqueci a senha</Text>
             </TouchableOpacity>
           </View>
 
           {/* Login Button */}
           <TouchableOpacity
             style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
             onPress={handleLogin}
             disabled={isLoading}
             activeOpacity={0.8}
           >
             {isLoading ? (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator color="#FFFFFF" size="small" />
                 <Text style={styles.loginButtonText}>Entrando...</Text>
               </View>
             ) : (
               <>
                 <Ionicons name="log-in-outline" size={22} color="#FFFFFF" />
                 <Text style={styles.loginButtonText}>Entrar</Text>
               </>
             )}
           </TouchableOpacity>
         </View>
 
         {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/register')} style={{ marginTop: 12 }}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>Ainda não tem conta? <Text style={{ color: '#8B5CF6', fontWeight: '700' }}>Registre-se</Text></Text>
          </TouchableOpacity>
        </View>

         {/* --- Fim do seu Design --- */}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
// --- Seus Estilos (mantidos 100%) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF9F5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  floatingIcon: {
    position: 'absolute',
    opacity: 0.3,
  },
  floatingIcon1: {
    top: 80,
    left: 30,
  },
  floatingIcon2: {
    top: 150,
    right: 40,
  },
  floatingIcon3: {
    bottom: 200,
    left: 40,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.12,
  },
  circle1: {
    width: 120,
    height: 120,
    backgroundColor: '#FDE68A',
    top: 60,
    left: 20,
  },
  circle2: {
    width: 90,
    height: 90,
    backgroundColor: '#FBCFE8',
    top: 140,
    right: 40,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: '#BFDBFE',
    bottom: 150,
    left: 30,
  },
  circle4: {
    width: 80,
    height: 80,
    backgroundColor: '#DDD6FE',
    bottom: 180,
    right: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  bookIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: '3deg' }],
  },
  starBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  heartBadge: {
    position: 'absolute',
    bottom: -5,
    left: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  paletteBadge: {
    position: 'absolute',
    top: 20,
    right: -28,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotYellow: {
    backgroundColor: '#FBBF24',
  },
  dotPink: {
    backgroundColor: '#F472B6',
  },
  dotPurple: {
    backgroundColor: '#A78BFA',
  },
  dotBlue: {
    backgroundColor: '#60A5FA',
  },
  dotGreen: {
    backgroundColor: '#34D399',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    height: '100%',
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    height: '100%',
    paddingRight: 8,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  rememberText: {
    fontSize: 14,
    color: '#6B7280',
  },
  forgotButton: {
    padding: 4,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  loginButton: {
    height: 54,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerLoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLove: {
    fontSize: 11,
    color: '#D1D5DB',
  },
});