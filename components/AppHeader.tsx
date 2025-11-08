// components/AppHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, LogOut } from 'lucide-react-native';
import { useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants'; // <-- 1. IMPORTAR CONSTANTS

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
}

export function AppHeader({ title, showBack = false }: AppHeaderProps) {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const segments = useSegments() as unknown as string[];

  const handleLogout = () => {
    signOut();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    // If we can't go back but user is SUPER_ADMIN, send them to the superadmin dashboard
    if (user?.role === 'SUPER_ADMIN') {
      router.replace('/(app)/(superadmin)/dashboard' as any);
      return;
    }

    // Fallback: try to go to school selection in the app group
    router.replace('/(app)/school-selection' as any);
  };

  const getInitials = () => {
    // Compose initials from name + lastName if available
    if (user?.name) {
      const parts = `${user.name} ${user.lastName || ''}`.trim().split(' ');
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return 'SA';
  };

  return (
    // --- CORREÇÃO AQUI ---
    // Este View agora é o container que aplica o padding
    <View style={styles.headerContainer}>
      {/* A Barra de Status fica aqui para ter a cor de fundo correta */}
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Esta é a barra de conteúdo do header */}
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {(
            /* Show back when explicitly requested, when router.canGoBack(),
               or for SUPER_ADMIN users who are not on the dashboard */
            showBack || router.canGoBack() || (user?.role === 'SUPER_ADMIN' && !((segments || []).includes('dashboard') || (segments || []).includes('(superadmin)')))
          ) && (
            <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
              <ArrowLeft size={24} color="#4B5563" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.rightContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <LogOut size={22} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 2. NOVO CONTAINER DO HEADER
  headerContainer: {
    backgroundColor: '#F9FAFB',
    // 3. A MÁGICA ACONTECE AQUI
    // Adiciona padding no topo igual ao tamanho da barra de status
    paddingTop: Constants.statusBarHeight, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
  },
  header: {
    height: 56, // Altura fixa para o conteúdo
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  titleContainer: {
    flex: 2, 
    alignItems: 'center',
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8, 
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDD6FE', 
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6', 
  },
});