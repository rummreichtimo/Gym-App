'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2, Upload } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatDate, toDateKey } from '@/lib/utils';
import type { ProgressPhotoDto } from '@/types';

const POSES = [
  { key: 'front', label: 'Vorne' },
  { key: 'side', label: 'Seite' },
  { key: 'back', label: 'Hinten' },
];

/**
 * Progress photos. Images are downscaled in the browser before upload so the
 * stored data URL stays small and the page loads quickly.
 */
export function ProgressPhotos() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<{ imageData: string; date: string; pose: string; note: string } | null>(null);
  const [preview, setPreview] = useState<ProgressPhotoDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgressPhotoDto | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['photos'],
    queryFn: () => api.get<{ photos: ProgressPhotoDto[] }>('/api/body/photos'),
  });

  const upload = useMutation({
    mutationFn: () => api.post('/api/body/photos', draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast.success('Foto gespeichert');
      setDraft(null);
    },
    onError: (error) => toast.error('Foto konnte nicht gespeichert werden', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/body/photos/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast.success('Foto gelöscht');
      setDeleteTarget(null);
      setPreview(null);
    },
    onError: (error) => toast.error('Foto konnte nicht gelöscht werden', errorMessage(error)),
  });

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Ungültige Datei', 'Bitte wähle ein Bild aus.');
      return;
    }

    setProcessing(true);
    try {
      const imageData = await downscaleImage(file, 1080, 0.78);
      setDraft({ imageData, date: toDateKey(), pose: 'front', note: '' });
    } catch {
      toast.error('Bild konnte nicht gelesen werden', 'Bitte versuche es mit einem anderen Foto.');
    } finally {
      setProcessing(false);
    }
  }

  if (isLoading) return <LoadingState rows={3} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const photos = data?.photos ?? [];

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        aria-hidden
      />

      <Button
        fullWidth
        size="lg"
        className="mb-4"
        onClick={() => fileInput.current?.click()}
        loading={processing}
      >
        <Upload className="h-4 w-4" />
        Fortschrittsfoto hinzufügen
      </Button>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-6 w-6" />}
          title="Noch keine Fotos"
          description="Fotos zeigen Veränderungen, die die Waage nicht abbildet. Nimm sie am besten immer in gleicher Pose und Beleuchtung auf."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setPreview(photo)}
              className="tap group relative overflow-hidden rounded-2xl border border-border bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageData}
                alt={`Fortschrittsfoto vom ${formatDate(photo.date)}`}
                className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-left">
                <span className="block text-xs font-semibold text-white">
                  {formatDate(photo.date, { withYear: false })}
                </span>
                <span className="block text-[11px] text-white/70">
                  {POSES.find((pose) => pose.key === photo.pose)?.label ?? photo.pose}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Upload details */}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title="Foto speichern"
        size="sm"
        footer={
          <Button fullWidth size="lg" onClick={() => upload.mutate()} loading={upload.isPending}>
            Speichern
          </Button>
        }
      >
        {draft ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.imageData}
              alt="Vorschau"
              className="mx-auto max-h-64 rounded-xl object-contain"
            />
            <Input
              label="Datum"
              type="date"
              value={draft.date}
              max={toDateKey()}
              onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            />
            <Select
              label="Pose"
              value={draft.pose}
              onChange={(event) => setDraft({ ...draft, pose: event.target.value })}
            >
              {POSES.map((pose) => (
                <option key={pose.key} value={pose.key}>
                  {pose.label}
                </option>
              ))}
            </Select>
            <Input
              label="Notiz (optional)"
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              placeholder="Ende Aufbauphase"
            />
          </div>
        ) : null}
      </Modal>

      {/* Full preview */}
      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? formatDate(preview.date, { weekday: true }) : ''}
        description={preview?.note || undefined}
        footer={
          <Button
            variant="danger"
            fullWidth
            size="lg"
            onClick={() => preview && setDeleteTarget(preview)}
          >
            <Trash2 className="h-4 w-4" />
            Foto löschen
          </Button>
        }
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.imageData}
            alt={`Fortschrittsfoto vom ${formatDate(preview.date)}`}
            className="mx-auto max-h-[60vh] rounded-xl object-contain"
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        loading={remove.isPending}
        title="Foto löschen?"
        message="Dieses Fortschrittsfoto wird dauerhaft gelöscht."
      />
    </>
  );
}

/**
 * Resizes an image to fit `maxSize` and re-encodes it as JPEG, keeping the
 * stored data URL well under the API limit.
 */
function downscaleImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('decode failed'));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('canvas unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
