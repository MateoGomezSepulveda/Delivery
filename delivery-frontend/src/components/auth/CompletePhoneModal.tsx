import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Phone } from 'lucide-react';
import { updateUserApi } from '@/api/endpoints/users.api';
import { extractErrorMessage } from '@/api/axios.client';
import { useAuthStore } from '@/store/useAuthStore';
import { validatePhoneNumber } from '@/utils/phone';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CompletePhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function CompletePhoneModal({
  isOpen,
  onClose,
  onCompleted,
}: CompletePhoneModalProps) {
  const { user, updateUserState } = useAuthStore();
  const [phone, setPhone] = useState(user?.phone || '');
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePhoneNumber(phone);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(undefined);
    setIsSaving(true);
    try {
      const updated = await updateUserApi(user._id, {
        phone: phone.trim(),
      });
      updateUserState({
        phone: updated.phone,
        isPhoneVerified: updated.isPhoneVerified,
      });
      toast.success('Número de celular guardado correctamente', {
        description: 'Ya puedes realizar tus pedidos sin restricciones.',
      });
      onClose();
      onCompleted?.();
    } catch (err) {
      toast.error('No se pudo guardar tu celular', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registra tu Número de Celular"
      description="Es obligatorio para que el repartidor pueda contactarte en tu entrega."
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="complete-phone-form"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Guardar celular
          </Button>
        </div>
      }
    >
      <form id="complete-phone-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Número de Celular"
          type="tel"
          placeholder="Ej. 300 123 4567"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (error) setError(undefined);
          }}
          leftIcon={<Phone className="w-4 h-4" />}
          error={error}
          helperText="Incluye 10 dígitos (ej. 300 123 4567 o +57 300 123 4567)."
          autoComplete="tel"
          autoFocus
        />
      </form>
    </Modal>
  );
}
