import { Redirect } from 'expo-router';
import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function IndexRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user?.role === 'DELIVERY') {
    return <Redirect href="/(delivery)" />;
  }

  return <Redirect href="/(client)" />;
}
