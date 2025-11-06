// app/login.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
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
} from 'react-native';
// import api from './lib/api'; // Não precisamos mais disto aqui
import { useAuth } from '../context/AuthContext'; // <- NOSSO NOVO HOOK

export default function LoginScreen() {
  // const router = useRouter(); // Não precisamos mais disto aqui
  const { signIn } = useAuth(); // <- PEGA A FUNÇÃO DO CONTEXTO

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // O redirecionamento será tratado pelo AuthContext
      // Não precisamos mais do 'router.replace' aqui.

    } catch (e: any) {
      console.error('Login error:', e);
      setError(e.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
               onPress={() => setRememberMe(!rememberMe)}
             >
               <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                 {rememberMe && (
                   <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                 )}
               </View>
               <Text style={styles.rememberText}>Lembrar-me</Text>
             </TouchableOpacity>
 
             <TouchableOpacity style={styles.forgotButton}>
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

         {/* --- Fim do seu Design --- */}
      </View>
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