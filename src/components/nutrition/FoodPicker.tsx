'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Apple, Plus } from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { FOOD_CATEGORIES, labelFor } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import type { FoodDto } from '@/types';

/** Scales a food's reference values to an arbitrary amount for live preview. */
function scale(food: FoodDto, amount: number) {
  const factor = food.servingSize > 0 ? amount / food.servingSize : 0;
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  };
}

export function FoodPicker({
  open,
  mealId,
  onClose,
  onAdded,
}: {
  open: boolean;
  mealId: string | null;
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedFood, setSelectedFood] = useState<FoodDto | null>(null);
  const [amount, setAmount] = useState('100');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['foods'],
    queryFn: () => api.get<{ foods: FoodDto[] }>('/api/foods'),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.foods ?? [])
      .filter((food) => {
        if (category !== 'all' && food.category !== category) return false;
        if (term && !`${food.name} ${food.brand}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .slice(0, 120);
  }, [data, search, category]);

  const addItem = useMutation({
    mutationFn: () =>
      api.post(`/api/nutrition/meals/${mealId}/items`, {
        foodId: selectedFood?.id,
        amount: Number(amount.replace(',', '.')),
      }),
    onSuccess: async () => {
      await onAdded();
      toast.success(`${selectedFood?.name} hinzugefügt`);
      setSelectedFood(null);
      close();
    },
    onError: (error) => toast.error('Eintrag konnte nicht gespeichert werden', errorMessage(error)),
  });

  const createFood = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post<{ food: FoodDto }>('/api/foods', values),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      toast.success('Lebensmittel gespeichert');
      setCreateOpen(false);
      // Jump straight into the portion step for the food just created.
      setSelectedFood(result.food);
      setAmount(String(result.food.servingSize));
    },
  });

  function close() {
    setSearch('');
    setSelectedFood(null);
    onClose();
  }

  // --- Portion step ---------------------------------------------------------
  if (selectedFood) {
    const parsedAmount = Number(amount.replace(',', '.')) || 0;
    const macros = scale(selectedFood, parsedAmount);
    const unit = selectedFood.servingUnit === 'piece' ? 'Stück' : selectedFood.servingUnit;

    return (
      <Modal
        open={open}
        onClose={() => setSelectedFood(null)}
        title={selectedFood.name}
        description={
          selectedFood.brand
            ? `${selectedFood.brand} · ${formatNumber(selectedFood.calories)} kcal pro ${formatNumber(selectedFood.servingSize)} ${unit}`
            : `${formatNumber(selectedFood.calories)} kcal pro ${formatNumber(selectedFood.servingSize)} ${unit}`
        }
        size="sm"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => addItem.mutate()}
            loading={addItem.isPending}
            disabled={parsedAmount <= 0}
          >
            Hinzufügen
          </Button>
        }
      >
        <Input
          label="Menge"
          type="number"
          inputMode="decimal"
          step="any"
          suffix={unit}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={parsedAmount <= 0 ? 'Bitte gib eine gültige Menge ein.' : undefined}
          autoFocus
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {(selectedFood.servingUnit === 'piece'
            ? [0.5, 1, 2, 3]
            : [50, 100, 150, 200, 250]
          ).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="tap rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
            >
              {formatNumber(preset, preset % 1 === 0 ? 0 : 1)} {unit}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-surface-2 p-3">
          <MacroPreview label="kcal" value={macros.calories} />
          <MacroPreview label="Protein" value={macros.protein} unit="g" />
          <MacroPreview label="Kohlenh." value={macros.carbs} unit="g" />
          <MacroPreview label="Fett" value={macros.fat} unit="g" />
        </div>
      </Modal>
    );
  }

  // --- Search step ----------------------------------------------------------
  return (
    <>
      <Modal open={open && !createOpen} onClose={close} title="Lebensmittel hinzufügen" size="lg">
        <div className="mb-4 space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Lebensmittel suchen…" />
          <div className="flex gap-2">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Kategorie filtern"
              className="flex-1"
            >
              <option value="all">Alle Kategorien</option>
              {FOOD_CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Neu
            </Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingState rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Apple className="h-6 w-6" />}
            title="Kein Lebensmittel gefunden"
            description="Lege es als eigenes Lebensmittel an, um es zukünftig schnell zu finden."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Lebensmittel anlegen
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFood(food);
                    setAmount(String(food.servingSize));
                  }}
                  className="tap flex w-full items-center gap-3 rounded-xl bg-surface-2 p-3 text-left transition-colors hover:bg-elevated"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {food.name}
                      {food.brand ? <span className="text-subtle"> · {food.brand}</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-subtle tabular-nums">
                      {formatNumber(food.calories)} kcal · {formatNumber(food.protein, 1)} g P ·{' '}
                      {formatNumber(food.carbs, 1)} g K · {formatNumber(food.fat, 1)} g F pro{' '}
                      {formatNumber(food.servingSize)}{' '}
                      {food.servingUnit === 'piece' ? 'Stück' : food.servingUnit}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-brand" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <CustomFoodModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createFood.mutate(values)}
        loading={createFood.isPending}
        error={createFood.error}
      />
    </>
  );
}

function MacroPreview({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-fg tabular-nums">
        {formatNumber(value, value < 10 ? 1 : 0)}
        {unit ? <span className="text-xs font-medium text-muted"> {unit}</span> : null}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-subtle">{label}</p>
    </div>
  );
}

export function CustomFoodModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  loading: boolean;
  error: unknown;
  initial?: FoodDto;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    brand: initial?.brand ?? '',
    servingSize: String(initial?.servingSize ?? 100),
    servingUnit: initial?.servingUnit ?? 'g',
    calories: initial?.calories !== undefined ? String(initial.calories) : '',
    protein: initial?.protein !== undefined ? String(initial.protein) : '',
    carbs: initial?.carbs !== undefined ? String(initial.carbs) : '',
    fat: initial?.fat !== undefined ? String(initial.fat) : '',
    category: initial?.category ?? 'other',
  });

  const fieldErrors = error instanceof ApiClientError ? (error.details ?? {}) : {};
  const message = error instanceof ApiClientError && !error.details ? errorMessage(error) : null;

  function number(value: string) {
    return Number(value.replace(',', '.')) || 0;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eigenes Lebensmittel"
      description="Trage die Nährwerte pro Portion ein – die App rechnet jede Menge automatisch um."
      footer={
        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={() =>
            onSubmit({
              name: form.name.trim(),
              brand: form.brand.trim(),
              servingSize: number(form.servingSize),
              servingUnit: form.servingUnit,
              calories: number(form.calories),
              protein: number(form.protein),
              carbs: number(form.carbs),
              fat: number(form.fat),
              category: form.category,
            })
          }
        >
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        {message ? (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {message}
          </div>
        ) : null}

        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          error={fieldErrors.name?.[0]}
          placeholder="Haferflocken"
          autoFocus
        />
        <Input
          label="Marke (optional)"
          value={form.brand}
          onChange={(event) => setForm({ ...form, brand: event.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Portionsgröße"
            type="number"
            inputMode="decimal"
            step="any"
            value={form.servingSize}
            onChange={(event) => setForm({ ...form, servingSize: event.target.value })}
            error={fieldErrors.servingSize?.[0]}
          />
          <Select
            label="Einheit"
            value={form.servingUnit}
            onChange={(event) => setForm({ ...form, servingUnit: event.target.value })}
          >
            <option value="g">Gramm (g)</option>
            <option value="ml">Milliliter (ml)</option>
            <option value="piece">Stück</option>
            <option value="portion">Portion</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kalorien"
            type="number"
            inputMode="decimal"
            suffix="kcal"
            value={form.calories}
            onChange={(event) => setForm({ ...form, calories: event.target.value })}
            error={fieldErrors.calories?.[0]}
          />
          <Input
            label="Protein"
            type="number"
            inputMode="decimal"
            step="any"
            suffix="g"
            value={form.protein}
            onChange={(event) => setForm({ ...form, protein: event.target.value })}
          />
          <Input
            label="Kohlenhydrate"
            type="number"
            inputMode="decimal"
            step="any"
            suffix="g"
            value={form.carbs}
            onChange={(event) => setForm({ ...form, carbs: event.target.value })}
          />
          <Input
            label="Fett"
            type="number"
            inputMode="decimal"
            step="any"
            suffix="g"
            value={form.fat}
            onChange={(event) => setForm({ ...form, fat: event.target.value })}
          />
        </div>

        <Select
          label="Kategorie"
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
        >
          {FOOD_CATEGORIES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>

        <p className="text-xs text-subtle">
          Kategorie: {labelFor(FOOD_CATEGORIES, form.category)}
        </p>
      </div>
    </Modal>
  );
}
