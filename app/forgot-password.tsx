import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Animações
  const [floatingAnim] = useState(new Animated.Value(0));
  const [bounceAnim1] = useState(new Animated.Value(0));
  const [bounceAnim2] = useState(new Animated.Value(0));

  React.useEffect(() => {
    // Floating animation
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

    // Bounce animations
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
    createBounce(bounceAnim2, 400);
  }, []);

  const translateY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const handleSend = async () => {
    if (!email) {
      toast.showToast('Informe seu e-mail.', 'warning');
      return;
    }

    setIsSending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('E-mail enviado. Verifique sua caixa de entrada para redefinir a senha.');
      setTimeout(() => router.replace('/login'), 1200);
    } catch (err: any) {
      console.log('Erro ao solicitar redefinição de senha:', err);
      const msg = err?.response?.data?.message || err?.response?.data || err.message || 'Erro ao enviar e-mail.';
      toast.showToast(String(msg), 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Toast visible={toast.toast.visible} message={toast.toast.message} type={toast.toast.type} onHide={toast.hideToast} />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Decorative Background Elements */}
          <View style={styles.decorativeContainer}>
            <Animated.View
              style={[
                styles.floatingIcon,
                styles.floatingIcon1,
                { transform: [{ translateY: bounceAnim1 }] },
              ]}
            >
              <Ionicons name="key" size={32} color="#FDE68A" />
            </Animated.View>
            <Animated.View
              style={[
                styles.floatingIcon,
                styles.floatingIcon2,
                { transform: [{ translateY: bounceAnim2 }] },
              ]}
            >
              <MaterialCommunityIcons name="lock-reset" size={28} color="#BFDBFE" />
            </Animated.View>

            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />
          </View>

          {/* Header Section */}
          <View style={styles.header}>
            <Animated.View style={[styles.logoContainer, { transform: [{ translateY }] }]}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="lock-reset" size={48} color="#8B5CF6" />
                <View style={styles.keyBadge}>
                  <Ionicons name="key" size={16} color="#F59E0B" />
                </View>
                <View style={styles.mailBadge}>
                  <Ionicons name="mail" size={14} color="#3B82F6" />
                </View>
              </View>
            </Animated.View>

            <Text style={styles.greeting}>Esqueceu a senha?</Text>
            <Text style={styles.subtitle}>
              Não se preocupe! Digite seu e-mail e enviaremos um link para redefinir sua senha
            </Text>

            {/* Decorative Dots */}
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dotYellow]} />
              <View style={[styles.dot, styles.dotPurple]} />
              <View style={[styles.dot, styles.dotBlue]} />
            </View>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="mail" size={16} color="#6B7280" />
                <Text style={styles.label}>E-mail cadastrado</Text>
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
                  editable={!isSending}
                />
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.sendButtonText}>Enviando...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Enviar link de redefinição</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/login')}
            >
              <Ionicons name="arrow-back" size={18} color="#8B5CF6" />
              <Text style={styles.backButtonText}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#8B5CF6" />
              <Text style={styles.infoText}>
                O link será válido por 1 hora. Verifique sua caixa de spam caso não encontre o e-mail.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    top: 100,
    left: 30,
  },
  floatingIcon2: {
    top: 160,
    right: 40,
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
    top: 80,
    left: 20,
  },
  circle2: {
    width: 100,
    height: 100,
    backgroundColor: '#BFDBFE',
    top: 180,
    right: 30,
  },
  circle3: {
    width: 90,
    height: 90,
    backgroundColor: '#DDD6FE',
    bottom: 160,
    left: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  iconContainer: {
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
    transform: [{ rotate: '-3deg' }],
  },
  keyBadge: {
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
  mailBadge: {
    position: 'absolute',
    bottom: -5,
    left: -5,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
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
  dotPurple: {
    backgroundColor: '#A78BFA',
  },
  dotBlue: {
    backgroundColor: '#60A5FA',
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
  inputGroup: {
    marginBottom: 20,
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
  sendButton: {
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
    marginBottom: 16,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    padding: 14,
    borderRadius: 16,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 18,
  },
});