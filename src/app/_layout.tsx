import '../../global.css';

import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteNav } from '@/components/layout/SiteNav';
import { sweepExpired } from '@/data/cache';

export default function RootLayout() {
  // The repository's own cache decides freshness (see data/cache.ts); the query client only tracks
  // loading and error state, so it never refetches behind the user's back.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } } }),
  );
  const [fontsLoaded] = useFonts({
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  useEffect(() => {
    sweepExpired();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>TrackiMetrix</title>
      </Head>
      <View className="flex-1 bg-ground" style={{ opacity: fontsLoaded ? 1 : 0 }}>
        <SiteNav />
        <ScrollView className="flex-1" contentContainerClassName="min-h-full">
          <View className="flex-1">
            <Slot />
          </View>
          <SiteFooter />
        </ScrollView>
      </View>
    </QueryClientProvider>
  );
}
