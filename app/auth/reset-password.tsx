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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleReset = async () => {
    if (!token) {
      toast.showToast('Token ausente. Abra o link enviado por e-mail.', 'error');
      return;
    }
    if (!password || password.length < 6) {
      toast.showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      toast.showToast('As senhas não coincidem.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Senha redefinida com sucesso. Faça login com a nova senha.');
      setTimeout(() => router.replace('/login'), 1200);
    } catch (err: any) {
      console.log('Erro ao redefinir senha:', err);
      const msg = err?.response?.data?.message || err?.response?.data || err?.message || 'Erro ao redefinir senha.';
      toast.showToast(String(msg), 'error');
    } finally {
      setLoading(false);
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
              <Ionicons name="shield-checkmark" size={32} color="#FDE68A" />
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
                <View style={styles.shieldBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                </View>
                <View style={styles.keyBadge}>
                  <Ionicons name="key" size={14} color="#F59E0B" />
                </View>
              </View>
            </Animated.View>

            <Text style={styles.greeting}>Redefinir Senha</Text>
            <Text style={styles.subtitle}>
              Crie uma nova senha segura para sua conta
            </Text>

            {/* Decorative Dots */}
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dotYellow]} />
              <View style={[styles.dot, styles.dotPurple]} />
              <View style={[styles.dot, styles.dotBlue]} />
              <View style={[styles.dot, styles.dotGreen]} />
            </View>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#8B5CF6" />
              <Text style={styles.infoText}>
                Sua senha deve ter no mínimo 6 caracteres. O link expira em 1 hora.
              </Text>
            </View>

            {/* Nova Senha */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
                <Text style={styles.label}>Nova senha</Text>
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
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
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

            {/* Confirmar Senha */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="lock-open" size={16} color="#6B7280" />
                <Text style={styles.label}>Confirmar senha</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-open-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite a senha novamente"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={22} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={[styles.resetButton, loading && styles.resetButtonDisabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.resetButtonText}>Redefinindo...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.resetButtonText}>Redefinir Senha</Text>
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

          {/* Footer Security Tips */}
          <View style={styles.footer}>
            <View style={styles.tipsBox}>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>Use letras e números</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>Evite informações pessoais</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>Mínimo de 6 caracteres</Text>
              </View>
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
  shieldBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  keyBadge: {
    position: 'absolute',
    bottom: -5,
    left: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    padding: 14,
    borderRadius: 16,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B21A8',
    lineHeight: 18,
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
  resetButton: {
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
    marginTop: 4,
    marginBottom: 16,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
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
  tipsBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    width: '100%',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
});