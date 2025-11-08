import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const { user, refreshUser, signOut } = useAuth();
  const handledRef = useRef(false);
  const [status, setStatus] = useState<'processing' | 'saved' | 'error' | 'done'>('processing');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handle = async () => {
      if (handledRef.current) return; // avoid duplicate processing (deep-link + user refresh can re-run effect)
      const t = Array.isArray(token) ? token[0] : token;
      handledRef.current = true;
      if (!t) {
        setStatus('error');
        setMessage('Token de convite ausente');
        return;
      }

      if (user) {
        // usuário já autenticado - tentar aceitar imediatamente
        try {
          await api.post('/invites/accept', { token: t });
          setStatus('done');
          setMessage('Convite aceito com sucesso!');
          // atualizar dados do usuário (escolas/roles)
          try { await refreshUser(); } catch (e) { /* ignore */ }
          // navegar ao dashboard
          setTimeout(() => router.replace('/'), 1200);
        } catch (e: any) {
          console.warn('Erro ao aceitar invite:', e?.response?.data || e.message);
          setStatus('error');
          setMessage('Falha ao aceitar o convite: ' + (e?.response?.data?.message || e?.message || 'Erro'));
          // redirect after brief delay so user is not stuck on screen
          setTimeout(() => {
            if (user) router.replace('/'); else router.replace('/login');
          }, 1200);
        }
      } else {
        // usuário não autenticado - salvar token e redirecionar para login
        try {
          await AsyncStorage.setItem('@pending_invite_token', t);
          setStatus('saved');
          setMessage('Token salvo. Faça login para aceitar o convite.');
          setTimeout(() => router.replace('/login'), 800);
        } catch (e: any) {
          setStatus('error');
          setMessage('Erro ao salvar token: ' + (e?.message || ''));
          setTimeout(() => router.replace('/login'), 800);
        }
      }
    };

    handle();
  }, [token, user]);

  return (
    <View style={styles.container}>
      {status === 'processing' && <>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Processando convite...</Text>
      </>}
      {status === 'saved' && <>
        <Text style={styles.text}>{message}</Text>
      </>}
      {status === 'done' && <>
        <Text style={styles.text}>{message}</Text>
      </>}
      {status === 'error' && <>
        <Text style={[styles.text, { color: 'red' }]}>{message}</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: '#F3E8FF', borderRadius: 8 }} onPress={() => { signOut(); router.replace('/'); }}>
          <Text style={{ color: '#5B21B6', fontWeight: '700' }}>Sair / Voltar</Text>
        </TouchableOpacity>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  text: { marginTop: 16, fontSize: 16, textAlign: 'center' },
});
