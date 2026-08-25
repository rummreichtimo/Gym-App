'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, UtensilsCrossed } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_MEALS } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import type { SavedMealDto } from '@/types';

/** Re-add a frequently eaten meal to any day with two taps. */
export function SavedMealsSheet({
  open,
  onClose,
  savedMeals,
  date,
  mealNames,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  savedMeals: SavedMealDto[];
  date: string;
  mealNames: string[];
  onApplied: () => Promise<void> | void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const options = mealNames.length > 0 ? mealNames : [...DEFAULT_MEALS];
  const [target, setTarget] = useState(options[0] ?? 'Frühstück');

  const apply = useMutation({
    mutationFn: (savedMealId: string) =>
      api.post(`/api/nutrition/saved-meals/${savedMealId}/apply`, { date, mealName: target }),
    onSuccess: async () => {
      await onApplied();
      toast.success('Mahlzeit hinzugefügt', `Zu „${target}“ übernommen.`);
      onClose();
    },
    onError: (error) => toast.error('Mahlzeit konnte nicht übernommen werden', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (savedMealId: string) => api.delete(`/api/nutrition/saved-meals/${savedMealId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      toast.success('Vorlage gelöscht');
    },
    onError: (error) => toast.error('Vorlage konnte nicht gelöscht werden', errorMessage(error)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Gespeicherte Mahlzeiten">
      {savedMeals.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title="Noch keine Vorlagen"
          description="Tippe bei einer Mahlzeit auf das Lesezeichen-Symbol, um sie als Vorlage zu speichern."
        />
      ) : (
        <>
          <Select
            label="Zu welcher Mahlzeit hinzufügen?"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="mb-4"
          >
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <ul className="space-y-2">
            {savedMeals.map((meal) => (
              <li key={meal.id} className="flex items-center gap-2 rounded-xl bg-surface-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{meal.name}</p>
                  <p className="mt-0.5 truncate text-xs text-subtle tabular-nums">
                    {formatNumber(meal.totals.calories)} kcal ·{' '}
                    {formatNumber(meal.totals.protein, 1)} g P · {meal.items.length}{' '}
                    {meal.items.length === 1 ? 'Zutat' : 'Zutaten'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => apply.mutate(meal.id)}
                  loading={apply.isPending && apply.variables === meal.id}
                >
                  Hinzufügen
                </Button>
                <button
                  type="button"
                  onClick={() => remove.mutate(meal.id)}
                  aria-label={`${meal.name} löschen`}
                  className="tap shrink-0 rounded-lg p-2 text-subtle transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
