import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  LocateFixed,
  MapPin,
  Plus,
  Star,
  Trash2,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '@/api/axios.client';
import {
  createAddressApi,
  deleteAddressApi,
  getMyAddressesApi,
  updateAddressApi,
} from '@/api/endpoints/addresses.api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartUiStore } from '@/store/useCartUiStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { Address } from '@/types/order.types';

export default function AddressesScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { selectedAddress, setSelectedAddress } = useCartUiStore();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('Casa');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Bogotá');
  const [stateName, setStateName] = useState('Cundinamarca');
  const [zipCode, setZipCode] = useState('110111');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [locatingGps, setLocatingGps] = useState(false);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: getMyAddressesApi,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAddressApi({
        title: title.trim() || 'Casa',
        street: street.trim(),
        city: city.trim() || 'Bogotá',
        state: stateName.trim() || 'Colombia',
        zipCode: zipCode.trim() || '110111',
        country: 'Colombia',
        deliveryInstructions: instructions.trim() || undefined,
        isDefault,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddress(created);
      setShowForm(false);
      setStreet('');
      setInstructions('');
      toast.success('Dirección guardada y seleccionada');
    },
    onError: (err) => {
      toast.error('No se pudo guardar la dirección', {
        description: extractErrorMessage(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddressApi(id),
    onSuccess: (_res, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
      if (selectedAddress?._id === deletedId) {
        setSelectedAddress(null);
      }
      toast.info('Dirección eliminada');
    },
    onError: (err) => {
      toast.error('No se pudo eliminar', {
        description: extractErrorMessage(err),
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (addr: Address) => updateAddressApi(addr._id, { isDefault: true }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddress(updated);
      toast.success('Dirección predeterminada actualizada');
    },
  });

  const handleUseCurrentGps = async () => {
    setLocatingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permiso de ubicación denegado', {
          description:
            'Habilita el GPS para autocompletar tu dirección automáticamente.',
        });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const geocoded = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      if (geocoded.length > 0) {
        const place = geocoded[0];
        const streetPart = [place.street, place.streetNumber, place.district]
          .filter(Boolean)
          .join(' ');
        setStreet(
          streetPart ||
            place.name ||
            `Lat ${pos.coords.latitude.toFixed(5)}, Lng ${pos.coords.longitude.toFixed(5)}`,
        );
        if (place.city || place.subregion) {
          setCity(place.city || place.subregion || 'Bogotá');
        }
        if (place.region) {
          setStateName(place.region);
        }
        if (place.postalCode) {
          setZipCode(place.postalCode);
        }
        setShowForm(true);
        toast.success('Ubicación GPS detectada', {
          description: 'Revisa los detalles y guarda tu dirección.',
        });
      }
    } catch (error) {
      toast.error('No pudimos obtener tu ubicación GPS', {
        description: extractErrorMessage(error),
      });
    } finally {
      setLocatingGps(false);
    }
  };

  const handleSaveAddress = () => {
    if (!street.trim()) {
      toast.warning('Ingresa la calle o dirección exacta');
      return;
    }
    createMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ArrowLeft size={18} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Mis Direcciones
          </Text>
        </View>

        {/* Acciones rápidas: GPS + Nueva Dirección */}
        <View style={styles.quickRow}>
          <View style={{ flex: 1 }}>
            <Button
              title="Usar mi GPS"
              variant="secondary"
              size="md"
              fullWidth
              loading={locatingGps}
              leftIcon={
                <LocateFixed size={16} color="#FFFFFF" strokeWidth={2.2} />
              }
              onPress={() => void handleUseCurrentGps()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={showForm ? 'Cerrar formulario' : 'Nueva dirección'}
              variant={showForm ? 'outline' : 'primary'}
              size="md"
              fullWidth
              leftIcon={
                !showForm ? (
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                ) : undefined
              }
              onPress={() => setShowForm((v) => !v)}
            />
          </View>
        </View>

        {/* Formulario de Nueva Dirección */}
        {showForm ? (
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Agregar dirección de entrega
            </Text>

            <View style={styles.labelChipsRow}>
              {['Casa', 'Apartamento', 'Oficina'].map((preset) => {
                const active = title === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setTitle(preset)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.surfaceMuted,
                        borderColor: active
                          ? colors.primary
                          : colors.borderStrong,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Etiqueta"
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Casa, Oficina"
            />

            <Input
              label="Dirección exacta (Calle, Carrera, Número, Barrio)"
              value={street}
              onChangeText={setStreet}
              placeholder="Ej. Cra 15 # 85-24 Apto 402"
            />

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Ciudad"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Bogotá"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Departamento"
                  value={stateName}
                  onChangeText={setStateName}
                  placeholder="Cundinamarca"
                />
              </View>
            </View>

            <Input
              label="Instrucciones para el repartidor (opcional)"
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Ej. Portería blanca, timbrar 402"
            />

            <Pressable
              onPress={() => setIsDefault((v) => !v)}
              style={styles.checkboxRow}
            >
              <CheckCircle2
                size={19}
                color={isDefault ? colors.primary : colors.textMuted}
                strokeWidth={2.2}
              />
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Usar como dirección predeterminada
              </Text>
            </Pressable>

            <Button
              title="Guardar y Seleccionar"
              size="lg"
              fullWidth
              loading={createMutation.isPending}
              onPress={handleSaveAddress}
            />
          </View>
        ) : null}

        {/* Listado de Direcciones Guardadas */}
        {!isLoading && addresses.length === 0 && !showForm ? (
          <EmptyState
            icon={MapPin}
            title="Aún no tienes direcciones guardadas"
            description="Usa tu GPS o registra tu dirección de casa u oficina para recibir tus pedidos sin demoras."
            actionLabel="Agregar mi primera dirección"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <View style={styles.listStack}>
            {addresses.map((addr) => {
              const isSelected = selectedAddress?._id === addr._id;

              return (
                <Pressable
                  key={addr._id}
                  onPress={() => {
                    setSelectedAddress(addr);
                    toast.success(`Entregaremos en ${addr.title}`);
                    router.back();
                  }}
                  style={[
                    styles.addrCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.border,
                      borderWidth: isSelected ? 1.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.addrHeader}>
                    <View style={styles.addrTitleRow}>
                      <MapPin
                        size={17}
                        color={isSelected ? colors.primary : colors.textSecondary}
                        strokeWidth={2.2}
                      />
                      <Text style={[styles.addrTitle, { color: colors.text }]}>
                        {addr.title}
                      </Text>
                      {addr.isDefault ? (
                        <Badge variant="primary" icon={Star}>
                          Principal
                        </Badge>
                      ) : null}
                      {isSelected ? (
                        <Badge variant="success" icon={CheckCircle2}>
                          Activa
                        </Badge>
                      ) : null}
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar dirección"
                      onPress={() => deleteMutation.mutate(addr._id)}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                    </Pressable>
                  </View>

                  <Text style={[styles.addrStreet, { color: colors.text }]}>
                    {addr.street}
                  </Text>
                  <Text
                    style={[styles.addrCity, { color: colors.textSecondary }]}
                  >
                    {addr.city}, {addr.state}
                  </Text>

                  {addr.deliveryInstructions ? (
                    <Text
                      style={[styles.addrNote, { color: colors.textMuted }]}
                    >
                      Nota: {addr.deliveryInstructions}
                    </Text>
                  ) : null}

                  {!addr.isDefault ? (
                    <Pressable
                      onPress={() => setDefaultMutation.mutate(addr)}
                      style={styles.makeDefaultBtn}
                    >
                      <Text
                        style={[
                          styles.makeDefaultText,
                          { color: colors.primary },
                        ]}
                      >
                        Marcar como principal
                      </Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: 21,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  formTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },
  labelChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13.5,
  },
  listStack: {
    gap: 12,
  },
  addrCard: {
    borderRadius: 20,
    padding: 15,
    gap: 6,
  },
  addrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  addrTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  addrTitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },
  addrStreet: {
    fontFamily: FONTS.sansSemi,
    fontSize: 14,
    marginTop: 2,
  },
  addrCity: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
  },
  addrNote: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontStyle: 'italic',
  },
  makeDefaultBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  makeDefaultText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
});
