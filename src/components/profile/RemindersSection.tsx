'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { REMINDER_TYPES, labelFor } from '@/lib/constants';
import { cn, weekdayName } from '@/lib/utils';
import type { ReminderDto } from '@/types';

/**
 * In-app reminders. They are evaluated server-side whenever the dashboard is
 * loaded and land in the notification inbox - no background worker required.
 */
export function RemindersSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.get<{ reminders: ReminderDto[] }>('/api/reminders'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reminders'] });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/api/reminders/${id}`, { enabled }),
    onSuccess: invalidate,
    onError: (error) => toast.error('Erinnerung konnte nicht geändert werden', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/reminders/${id}`),
    onSuccess: async () => {
      await invalidate();
      toast.success('Erinnerung gelöscht');
    },
    onError: (error) => toast.error('Erinnerung konnte nicht gelöscht werden', errorMessage(error)),
  });

  const reminders = data?.reminders ?? [];

  return (
    <Card>
      <CardHeader
        title="Erinnerungen"
        subtitle="Erscheinen in deinem Posteingang in der App"
        icon={<Bell className="h-4 w-4" />}
        action={
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Neu
          </Button>
        }
      />

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <LoadingState rows={2} />
        ) : reminders.length === 0 ? (
          <EmptyState
            title="Noch keine Erinnerungen"
            description="Lege zum Beispiel eine Erinnerung an dein Training oder ans wöchentliche Wiegen an."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                Erinnerung erstellen
              </Button>
            }
            className="border-0 py-6"
          />
        ) : (
          <ul className="space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{reminder.title}</p>
                  <p className="mt-0.5 truncate text-xs text-subtle">
                    {labelFor(REMINDER_TYPES, reminder.type)} · {reminder.time} Uhr ·{' '}
                    {reminder.weekdays.length === 0
                      ? 'täglich'
                      : reminder.weekdays.map((day) => weekdayName(day, true)).join(', ')}
                  </p>
                </div>
                <Switch
                  checked={reminder.enabled}
                  onChange={(enabled) => toggle.mutate({ id: reminder.id, enabled })}
                />
                <button
                  type="button"
                  onClick={() => remove.mutate(reminder.id)}
                  aria-label={`${reminder.title} löschen`}
                  className="tap shrink-0 rounded-lg p-2 text-subtle transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReminderForm open={formOpen} onClose={() => setFormOpen(false)} />
    </Card>
  );
}

function ReminderForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: 'workout',
    title: 'Zeit für dein Training',
    time: '18:00',
    weekdays: [] as number[],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const save = useMutation({
    mutationFn: () => api.post('/api/reminders', { ...form, enabled: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Erinnerung erstellt');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Erinnerung konnte nicht gespeichert werden', errorMessage(error));
    },
  });

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((item) => item !== day)
        : [...current.weekdays, day].sort(),
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neue Erinnerung"
      footer={
        <Button fullWidth size="lg" onClick={() => save.mutate()} loading={save.isPending}>
          Erstellen
        </Button>
      }
    >
      <div className="space-y-4">
        <Select
          label="Art"
          value={form.type}
          onChange={(event) => {
            const type = event.target.value;
            const preset = REMINDER_TYPES.find((item) => item.key === type);
            setForm((current) => ({ ...current, type, title: preset?.description ?? current.title }));
          }}
        >
          {REMINDER_TYPES.map((type) => (
            <option key={type.key} value={type.key}>
              {type.label}
            </option>
          ))}
        </Select>

        <Input
          label="Text"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          error={fieldErrors.title?.[0]}
        />

        <Input
          label="Uhrzeit"
          type="time"
          value={form.time}
          onChange={(event) => setForm({ ...form, time: event.target.value })}
          error={fieldErrors.time?.[0]}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-muted">
            Wochentage{' '}
            <span className="font-normal text-subtle">(keine Auswahl = täglich)</span>
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={form.weekdays.includes(day)}
                className={cn(
                  'tap h-10 rounded-lg text-xs font-semibold transition-colors',
                  form.weekdays.includes(day)
                    ? 'bg-brand text-brand-fg'
                    : 'bg-elevated text-muted hover:text-fg',
                )}
              >
                {weekdayName(day, true)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
