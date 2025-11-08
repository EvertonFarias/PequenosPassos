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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, ChevronDown, Eye, EyeOff } from 'lucide-react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

export default function RegisterScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animações
  const [floatingAnim] = useState(new Animated.Value(0));
  const [bounceAnim1] = useState(new Animated.Value(0));
  const [bounceAnim2] = useState(new Animated.Value(0));
  const [bounceAnim3] = useState(new Animated.Value(0));

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
    createBounce(bounceAnim2, 300);
    createBounce(bounceAnim3, 600);
  }, []);

  const translateY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  // Validação de email
  const validateEmail = (e: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
    return re.test(String(e).toLowerCase());
  };

  // Validação de CPF
  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) checkDigit = 0;
    if (checkDigit !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  };

  // Máscara de CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleCPFChange = (text: string) => {
    const formatted = formatCPF(text);
    setCpf(formatted);
  };

  // Máscara de data (DD/MM/YYYY)
  const formatDate = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDate(text);
    setDateOfBirth(formatted);
  };

  // Validação de data brasileira
  const validateBrazilianDate = (date: string) => {
    if (!date) return false;
    const parts = date.split('/');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return false;
    
    return true;
  };

  // Converte data brasileira para ISO
  const brazilianToISO = (date: string) => {
    const parts = date.split('/');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  };

  // Simple name validation
  const sanitizeName = (text: string) => text.replace(/[^\p{L} \-']/gu, '').trim();

  const handleFirstNameChange = (text: string) => {
    setFirstName(sanitizeName(text));
  };

  const handleLastNameChange = (text: string) => {
    setLastName(sanitizeName(text));
  };

  // Handler do DatePicker
  const onDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && event.type === 'set') {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDateOfBirth(`${day}/${month}/${year}`);
    }
  };

  const handleRegister = async () => {
    toast.hideToast();

    if (!firstName || !lastName || !email || !password || !confirmPassword || !cpf || !dateOfBirth) {
      toast.showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }
    if (firstName.length < 2) {
      toast.showToast('Nome deve ter no mínimo 2 caracteres.', 'warning');
      return;
    }

    if (!validateEmail(email)) {
      toast.showToast('E-mail inválido.', 'error');
      return;
    }

    if (password.length < 6) {
      toast.showToast('A senha deve ter no mínimo 6 caracteres.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      toast.showToast('As senhas não conferem.', 'error');
      return;
    }

    if (!validateCPF(cpf)) {
      toast.showToast('CPF inválido.', 'error');
      return;
    }

    if (!validateBrazilianDate(dateOfBirth)) {
      toast.showToast('Data de nascimento inválida.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: firstName.trim(),
        lastName: lastName.trim(),
        password,
        email: email.toLowerCase().trim(),
        gender,
        cpf: cpf.replace(/[^\d]/g, ''),
        dateOfBirth: brazilianToISO(dateOfBirth),
      };

      await api.post('/auth/register', payload);

      toast.success('Conta criada. Verifique seu e-mail para confirmar a conta.');
      setTimeout(() => router.replace('/login'), 1100);
    } catch (e: any) {
      console.log('Register error', e);
      const serverMsg = e?.response?.data?.message || e?.response?.data || e.message || 'Erro ao registrar usuário.';
      toast.showToast(String(serverMsg), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Toast visible={toast.toast.visible} message={toast.toast.message} type={toast.toast.type} onHide={toast.hideToast} />
      
      <ScrollView
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
                { transform: [{ translateY: bounceAnim1 }] }
              ]}
            >
              <Ionicons name="person-add" size={32} color="#FDE68A" />
            </Animated.View>
            <Animated.View 
              style={[
                styles.floatingIcon, 
                styles.floatingIcon2,
                { transform: [{ translateY: bounceAnim2 }] }
              ]}
            >
              <MaterialCommunityIcons name="account-heart" size={28} color="#FBCFE8" />
            </Animated.View>
            <Animated.View 
              style={[
                styles.floatingIcon, 
                styles.floatingIcon3,
                { transform: [{ translateY: bounceAnim3 }] }
              ]}
            >
              <Ionicons name="sparkles" size={30} color="#BFDBFE" />
            </Animated.View>
            
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />
            <View style={[styles.circle, styles.circle4]} />
          </View>

          {/* Header Section */}
          <View style={styles.header}>
            <Animated.View style={[styles.logoContainer, { transform: [{ translateY }] }]}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="account-plus" size={48} color="#8B5CF6" />
                <View style={styles.starBadge}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                </View>
                <View style={styles.heartBadge}>
                  <Ionicons name="heart" size={16} color="#EC4899" />
                </View>
              </View>
            </Animated.View>

            <Text style={styles.greeting}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se a nós e comece sua jornada</Text>

            {/* Decorative Dots */}
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dotYellow]} />
              <View style={[styles.dot, styles.dotPink]} />
              <View style={[styles.dot, styles.dotPurple]} />
              <View style={[styles.dot, styles.dotBlue]} />
              <View style={[styles.dot, styles.dotGreen]} />
            </View>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* First & Last Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="person" size={16} color="#6B7280" />
                <Text style={styles.label}>Nome *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                  autoCapitalize="words"
                  placeholder="Digite seu nome"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="people" size={16} color="#6B7280" />
                <Text style={styles.label}>Sobrenome *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="people-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={handleLastNameChange}
                  autoCapitalize="words"
                  placeholder="Digite seu sobrenome"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="mail" size={16} color="#6B7280" />
                <Text style={styles.label}>E-mail *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => setEmail(text.toLowerCase().trim())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="seu@email.com"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* CPF */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="card" size={16} color="#6B7280" />
                <Text style={styles.label}>CPF *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={cpf}
                  onChangeText={handleCPFChange}
                  keyboardType="numeric"
                  placeholder="000.000.000-00"
                  placeholderTextColor="#9CA3AF"
                  maxLength={14}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Data de Nascimento */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="calendar" size={16} color="#6B7280" />
                <Text style={styles.label}>Data de Nascimento *</Text>
              </View>
              <View style={styles.dateRow}>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={dateOfBirth}
                    onChangeText={handleDateChange}
                    keyboardType="numeric"
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    maxLength={10}
                    editable={!isLoading}
                  />
                </View>
                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={() => setShowDatePicker(true)}
                  disabled={isLoading}
                >
                  <Calendar size={20} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth ? new Date(brazilianToISO(dateOfBirth)) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDatePickerChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {/* Gênero */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="transgender" size={16} color="#6B7280" />
                <Text style={styles.label}>Gênero *</Text>
              </View>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowGenderPicker(!showGenderPicker)}
                disabled={isLoading}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="transgender-outline" size={20} color="#9CA3AF" />
                  <Text style={styles.pickerButtonText}>
                    {gender === 'MALE' ? 'Masculino' : gender === 'FEMALE' ? 'Feminino' : 'Outro'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {showGenderPicker && (
                <View style={styles.pickerOptions}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setGender('MALE');
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Masculino</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setGender('FEMALE');
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Feminino</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerOption, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setGender('OTHER');
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Outro</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Senha */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
                <Text style={styles.label}>Senha *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
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

            {/* Confirmar Senha */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
                <Text style={styles.label}>Confirmar Senha *</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Digite a senha novamente"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
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

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitText}>Criando conta...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.submitText}>Criar Conta</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLinkText}>
                Já tem conta?{' '}
                <Text style={styles.loginLinkHighlight}>Entrar</Text>
              </Text>
            </TouchableOpacity>
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
    paddingTop: 60,
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
  iconBox: {
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarButton: {
    width: 50,
    height: 50,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#1F2937',
  },
  pickerOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 20,
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
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
    marginBottom: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
});