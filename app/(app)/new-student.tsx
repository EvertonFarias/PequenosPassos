import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Save, User, Calendar, Phone, Users } from 'lucide-react-native';
import api from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';

export default function NewStudentScreen() {
  const params = useLocalSearchParams();
  const classroomId = params.classroomId as string;
  const classroomName = params.classroomName as string;
  const schoolId = params.schoolId as string;
  const schoolName = params.schoolName as string;

  // Determina se está criando para turma ou escola
  const isForClassroom = !!classroomId;
  const isForSchool = !!schoolId && !classroomId;

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validações
  const [errors, setErrors] = useState({
    name: '',
    birthDate: '',
    guardianName: '',
    guardianPhone: '',
  });

  const formatPhone = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Formata (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (limited.length <= 2) return limited;
    if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const formatDate = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    const limited = numbers.slice(0, 8);
    
    // Formata DD/MM/YYYY
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      birthDate: '',
      guardianName: '',
      guardianPhone: '',
    };

    let isValid = true;

    // Validação do nome
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      isValid = false;
    } else if (name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      isValid = false;
    } else if (name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
      isValid = false;
    }

    // Validação da data de nascimento
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!birthDate.trim()) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
      isValid = false;
    } else if (!datePattern.test(birthDate)) {
      newErrors.birthDate = 'Data inválida (use DD/MM/AAAA)';
      isValid = false;
    } else {
      const [day, month, year] = birthDate.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year ||
        year < 1900 ||
        year > new Date().getFullYear()
      ) {
        newErrors.birthDate = 'Data inválida';
        isValid = false;
      }
    }

    // Validação do nome do responsável (opcional mas se preenchido deve ter ao menos 3 caracteres)
    if (guardianName.trim() && guardianName.trim().length < 3) {
      newErrors.guardianName = 'Nome do responsável deve ter pelo menos 3 caracteres';
      isValid = false;
    } else if (guardianName.trim().length > 100) {
      newErrors.guardianName = 'Nome do responsável deve ter no máximo 100 caracteres';
      isValid = false;
    }

    // Validação do telefone (opcional mas se preenchido deve ter formato correto)
    const phoneNumbers = guardianPhone.replace(/\D/g, '');
    if (guardianPhone.trim() && (phoneNumbers.length < 10 || phoneNumbers.length > 11)) {
      newErrors.guardianPhone = 'Telefone deve ter 10 ou 11 dígitos';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Erro de Validação', 'Por favor, corrija os erros no formulário.');
      return;
    }

    setIsSaving(true);

    try {
      // Converte a data para o formato ISO (YYYY-MM-DD)
      const [day, month, year] = birthDate.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const payload = {
        name: name.trim(),
        birthDate: isoDate,
        guardianName: guardianName.trim() || null,
        guardianPhone: guardianPhone.replace(/\D/g, '') || null,
      };

      // Endpoint diferente se for criar para escola ou turma
      if (isForSchool) {
        await api.post(`/students/school/${schoolId}`, payload);
      } else if (isForClassroom) {
        await api.post(`/classrooms/${classroomId}/students`, payload);
      }

      Alert.alert(
        'Sucesso!',
        'Aluno cadastrado com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erro ao cadastrar aluno:', error);
      const message = error.response?.data?.message || 'Erro ao cadastrar aluno. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Novo Aluno" showBack={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <User size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Novo Aluno</Text>
            <Text style={styles.subtitle}>
              {isForClassroom ? `Turma: ${classroomName}` : `Escola: ${schoolName}`}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {/* Nome do Aluno */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <User size={16} color="#8B5CF6" />
              <Text style={styles.label}>Nome do Aluno *</Text>
            </View>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Digite o nome completo"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              maxLength={100}
              autoCapitalize="words"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            <Text style={styles.helperText}>{name.length}/100 caracteres</Text>
          </View>

          {/* Data de Nascimento */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Calendar size={16} color="#8B5CF6" />
              <Text style={styles.label}>Data de Nascimento *</Text>
            </View>
            <TextInput
              style={[styles.input, errors.birthDate && styles.inputError]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#9CA3AF"
              value={birthDate}
              onChangeText={(text) => {
                setBirthDate(formatDate(text));
                if (errors.birthDate) setErrors({ ...errors, birthDate: '' });
              }}
              keyboardType="numeric"
              maxLength={10}
            />
            {errors.birthDate ? <Text style={styles.errorText}>{errors.birthDate}</Text> : null}
          </View>

          {/* Nome do Responsável */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Users size={16} color="#6B7280" />
              <Text style={styles.label}>Nome do Responsável</Text>
              <Text style={styles.optionalBadge}>Opcional</Text>
            </View>
            <TextInput
              style={[styles.input, errors.guardianName && styles.inputError]}
              placeholder="Digite o nome do responsável"
              placeholderTextColor="#9CA3AF"
              value={guardianName}
              onChangeText={(text) => {
                setGuardianName(text);
                if (errors.guardianName) setErrors({ ...errors, guardianName: '' });
              }}
              maxLength={100}
              autoCapitalize="words"
            />
            {errors.guardianName ? <Text style={styles.errorText}>{errors.guardianName}</Text> : null}
          </View>

          {/* Telefone do Responsável */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Phone size={16} color="#6B7280" />
              <Text style={styles.label}>Telefone do Responsável</Text>
              <Text style={styles.optionalBadge}>Opcional</Text>
            </View>
            <TextInput
              style={[styles.input, errors.guardianPhone && styles.inputError]}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#9CA3AF"
              value={guardianPhone}
              onChangeText={(text) => {
                setGuardianPhone(formatPhone(text));
                if (errors.guardianPhone) setErrors({ ...errors, guardianPhone: '' });
              }}
              keyboardType="phone-pad"
              maxLength={15}
            />
            {errors.guardianPhone ? <Text style={styles.errorText}>{errors.guardianPhone}</Text> : null}
          </View>

          {/* Required Fields Note */}
          <View style={styles.requiredNote}>
            <Text style={styles.requiredNoteText}>* Campos obrigatórios</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer with Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Cadastrar Aluno</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  optionalBadge: {
    fontSize: 11,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  requiredNote: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  requiredNoteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
