'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { FoodPicker } from './FoodPicker';
import { SavedMealsSheet } from './SavedMealsSheet';
import { addDaysToKey, formatNumber, relativeDay, toDateKey } from '@/lib/utils';
import type { MealDto, NutritionDayDto, SavedMealDto } from '@/types';

interface DayResponse {
  day: NutritionDayDto;
  savedMeals: SavedMealDto[];
}

export function NutritionView() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const dateParam = useSearchParams().get('date');

  const [date, setDate] = useState(dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : toDateKey());
  const [pickerMealId, setPickerMealId] = useState<string | null>(null);
  const [savedSheetOpen, setSavedSheetOpen] = useState(false);
  const [newMealOpen, setNewMealOpen] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [saveMealTarget, setSaveMealTarget] = useState<MealDto | null>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [deleteMeal, setDeleteMeal] = useState<MealDto | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['nutrition', date],
    queryFn: () => api.get<DayResponse>(`/api/nutrition/day?date=${date}`),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const addMeal = useMutation({
    mutationFn: () => api.post('/api/nutrition/meals', { date, name: newMealName.trim() }),
    onSuccess: async () => {
      await invalidate();
      setNewMealOpen(false);
      setNewMealName('');
      toast.success('Mahlzeit hinzugefügt');
    },
    onError: (error) => toast.error('Mahlzeit konnte nicht angelegt werden', errorMessage(error)),
  });

  const removeMeal = useMutation({
    mutationFn: (mealId: string) => api.delete(`/api/nutrition/meals/${mealId}`),
    onSuccess: async () => {
      await invalidate();
      setDeleteMeal(null);
      toast.success('Mahlzeit gelöscht');
    },
    onError: (error) => toast.error('Mahlzeit konnte nicht gelöscht werden', errorMessage(error)),
  });

  const removeItem = useMutation({
    mutationFn: ({ mealId, itemId }: { mealId: string; itemId: string }) =>
      api.delete(`/api/nutrition/meals/${mealId}/items/${itemId}`),
    onSuccess: invalidate,
    onError: (error) => toast.error('Eintrag konnte nicht gelöscht werden', errorMessage(error)),
  });

  const updateAmount = useMutation({
    mutationFn: ({ mealId, itemId, amount }: { mealId: string; itemId: string; amount: number }) =>
      api.patch(`/api/nutrition/meals/${mealId}/items/${itemId}`, { amount }),
    onSuccess: invalidate,
    onError: (error) => toast.error('Menge konnte nicht geändert werden', errorMessage(error)),
  });

  const saveMeal = useMutation({
    mutationFn: () =>
      api.post('/api/nutrition/saved-meals', {
        name: saveMealName.trim(),
        mealId: saveMealTarget?.id,
      }),
    onSuccess: async () => {
      await invalidate();
      setSaveMealTarget(null);
      setSaveMealName('');
      toast.success('Mahlzeit gespeichert', 'Du findest sie unter „Gespeicherte Mahlzeiten“.');
    },
    onError: (error) => toast.error('Mahlzeit konnte nicht gespeichert werden', errorMessage(error)),
  });

  const day = data?.day;
  const isToday = date === toDateKey();

  return (
    <PageShell>
      {/* Date navigation */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDate(addDaysToKey(date, -1))}
          aria-label="Vorheriger Tag"
          className="tap rounded-xl border border-border bg-surface p-2.5 text-muted transition-colors hover:text-fg"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-fg">{relativeDay(date)}</p>
          <input
            type="date"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            aria-label="Datum wählen"
            className="mt-0.5 bg-transparent text-center text-xs text-subtle focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setDate(addDaysToKey(date, 1))}
          aria-label="Nächster Tag"
          disabled={date >= toDateKey()}
          className="tap rounded-xl border border-border bg-surface p-2.5 text-muted transition-colors hover:text-fg disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError || !day ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <>
          <DaySummary day={day} />

          <div className="mt-4 space-y-3">
            {day.meals.map((meal) => (
              <Card key={meal.id}>
                <div className="flex items-start justify-between gap-2 border-b border-border p-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-fg">{meal.name}</h3>
                    <p className="mt-0.5 text-xs text-subtle tabular-nums">
                      {formatNumber(meal.totals.calories)} kcal · {formatNumber(meal.totals.protein, 1)} g P
                      · {formatNumber(meal.totals.carbs, 1)} g K · {formatNumber(meal.totals.fat, 1)} g F
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    {meal.items.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSaveMealTarget(meal);
                          setSaveMealName(meal.name);
                        }}
                        aria-label={`${meal.name} als Vorlage speichern`}
                        className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setDeleteMeal(meal)}
                      aria-label={`${meal.name} löschen`}
                      className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {meal.items.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {meal.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                          <p className="mt-0.5 text-xs text-subtle tabular-nums">
                            {formatNumber(item.calories)} kcal · {formatNumber(item.protein, 1)} g P ·{' '}
                            {formatNumber(item.carbs, 1)} g K · {formatNumber(item.fat, 1)} g F
                          </p>
                        </div>
                        <AmountInput
                          amount={item.amount}
                          unit={item.unit}
                          onChange={(amount) =>
                            updateAmount.mutate({ mealId: meal.id, itemId: item.id, amount })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeItem.mutate({ mealId: meal.id, itemId: item.id })}
                          aria-label={`${item.name} entfernen`}
                          className="tap shrink-0 rounded-lg p-1.5 text-subtle transition-colors hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setPickerMealId(meal.id)}
                    className="tap flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
                  >
                    <Plus className="h-4 w-4" />
                    Lebensmittel hinzufügen
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" fullWidth onClick={() => setNewMealOpen(true)}>
              <Plus className="h-4 w-4" />
              Eigene Mahlzeit
            </Button>
            <Button variant="outline" fullWidth onClick={() => setSavedSheetOpen(true)}>
              <UtensilsCrossed className="h-4 w-4" />
              Gespeicherte Mahlzeiten ({data?.savedMeals.length ?? 0})
            </Button>
          </div>
        </>
      )}

      <FoodPicker
        open={pickerMealId !== null}
        mealId={pickerMealId}
        onClose={() => setPickerMealId(null)}
        onAdded={invalidate}
      />

      <SavedMealsSheet
        open={savedSheetOpen}
        onClose={() => setSavedSheetOpen(false)}
        savedMeals={data?.savedMeals ?? []}
        date={date}
        mealNames={day?.meals.map((meal) => meal.name) ?? []}
        onApplied={invalidate}
      />

      <Modal
        open={newMealOpen}
        onClose={() => setNewMealOpen(false)}
        title="Eigene Mahlzeit"
        description="Zum Beispiel „Pre-Workout“ oder „Zweites Frühstück“."
        size="sm"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => addMeal.mutate()}
            loading={addMeal.isPending}
            disabled={newMealName.trim().length === 0}
          >
            Hinzufügen
          </Button>
        }
      >
        <Input
          label="Name"
          value={newMealName}
          onChange={(event) => setNewMealName(event.target.value)}
          placeholder="Pre-Workout"
          autoFocus
        />
      </Modal>

      <Modal
        open={saveMealTarget !== null}
        onClose={() => setSaveMealTarget(null)}
        title="Mahlzeit speichern"
        description="Speichere diese Zusammenstellung, um sie später mit einem Tipp erneut hinzuzufügen."
        size="sm"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => saveMeal.mutate()}
            loading={saveMeal.isPending}
            disabled={saveMealName.trim().length < 2}
          >
            Speichern
          </Button>
        }
      >
        <Input
          label="Name der Vorlage"
          value={saveMealName}
          onChange={(event) => setSaveMealName(event.target.value)}
          placeholder="Mein Standard-Frühstück"
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        open={deleteMeal !== null}
        onClose={() => setDeleteMeal(null)}
        onConfirm={() => deleteMeal && removeMeal.mutate(deleteMeal.id)}
        loading={removeMeal.isPending}
        title="Mahlzeit löschen?"
        message={`„${deleteMeal?.name}“ und alle darin enthaltenen Lebensmittel werden für diesen Tag gelöscht.`}
      />
    </PageShell>
  );
}

function DaySummary({ day }: { day: NutritionDayDto }) {
  const { totals, targets } = day;
  const remaining = targets.calories - totals.calories;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <ProgressRing value={totals.calories} max={targets.calories} size={128} strokeWidth={11}>
          <span className="text-2xl font-bold text-fg tabular-nums">
            {formatNumber(totals.calories)}
          </span>
          <span className="text-[11px] text-subtle">von {formatNumber(targets.calories)} kcal</span>
        </ProgressRing>

        <div className="w-full flex-1 space-y-3.5">
          <Macro label="Protein" value={totals.protein} target={targets.protein} color="success" />
          <Macro label="Kohlenhydrate" value={totals.carbs} target={targets.carbs} color="info" />
          <Macro label="Fett" value={totals.fat} target={targets.fat} color="warning" />
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-3 text-center text-sm text-muted">
        {remaining > 0
          ? `Noch ${formatNumber(remaining)} kcal übrig.`
          : remaining === 0
            ? 'Kalorienziel genau erreicht.'
            : `${formatNumber(Math.abs(remaining))} kcal über deinem Ziel.`}
      </p>
    </Card>
  );
}

function Macro({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: 'success' | 'info' | 'warning';
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="text-sm font-semibold text-fg tabular-nums">
          {formatNumber(value, 1)} / {formatNumber(target)} g
        </span>
      </div>
      <ProgressBar value={value} max={target} color={color} />
    </div>
  );
}

/** Inline portion editor - recalculates macros server-side on blur. */
function AmountInput({
  amount,
  unit,
  onChange,
}: {
  amount: number;
  unit: string;
  onChange: (amount: number) => void;
}) {
  const [value, setValue] = useState(String(amount));

  function commit() {
    const parsed = Number(value.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      setValue(String(amount));
      return;
    }
    if (Math.abs(parsed - amount) < 0.001) return;
    onChange(parsed);
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        aria-label={`Menge in ${unit}`}
        className="h-9 w-16 rounded-lg border border-border bg-surface-2 px-1 text-center text-sm font-semibold text-fg focus:border-brand focus:outline-none"
      />
      <span className="w-6 text-xs text-subtle">{unit === 'piece' ? 'St.' : unit}</span>
    </div>
  );
}
