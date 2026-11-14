import { BookOpen } from "lucide-react";
import { CutoffForm } from "@/components/admin/cutoff-form";
import { FilterSelect } from "@/components/admin/filters";
import { MenuBoard } from "@/components/admin/menu-board";
import { PageTitle } from "@/components/ui/ui";
import { officeScope, requireStaff } from "@/lib/session";
import { todayStr, weekdayOf } from "@/lib/time";
import { optionsForDate, savedMeals, weeklyOptions } from "@/server/menu";
import { listOffices } from "@/server/offices";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const offices = await listOffices({ scope });
  const active = offices.filter((o) => o.active);
  const office = sp.office && offices.some((o) => o.id === sp.office) ? sp.office : "all";
  const selected = office === "all" ? null : offices.find((o) => o.id === office)!;
  const preview = selected ?? active[0] ?? offices[0];
  const today = todayStr();

  const targets = selected ? [selected] : preview ? [preview] : [];
  const [weekly, liveLists, saved, archived] = await Promise.all([
    preview ? weeklyOptions(preview.id) : Promise.resolve([]),
    Promise.all(targets.map(async (o) => (await optionsForDate(o.id, today, { includeStockedOut: true })).map((opt) => ({ ...opt, office: selected ? o.name : "All locations" })))),
    savedMeals(false),
    savedMeals(true),
  ]);
  const scopeLabel = selected ? selected.name : "all locations";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitle icon={<BookOpen className="h-5 w-5" />} title="Menu">
        Set weekday templates (every Sunday, etc.) or publish specific dates. Lunch and dinner cutoffs are per office (Asia/Dhaka).
      </PageTitle>

      <div>
        <FilterSelect
          param="office"
          label="Office"
          value={office}
          className="w-64"
          options={[{ value: "all", label: "All locations" }, ...offices.map((o) => ({ value: o.id, label: o.name }))]}
        />
        <p className="mt-1.5 text-[11px] text-ink-muted">
          {selected
            ? `Changes apply only to ${selected.name}.`
            : `New menu options, cutoffs, and dinner apply to every active office (${active.length}).`}
        </p>
      </div>

      {preview ? (
        <CutoffForm
          key={`${office}-${preview.lunchCutoff}-${preview.dinnerCutoff}-${preview.offerDinner}`}
          office={office}
          lunch={preview.lunchCutoff}
          dinner={preview.dinnerCutoff}
          offerDinner={preview.offerDinner}
          scopeLabel={scopeLabel}
        />
      ) : null}

      <MenuBoard
        office={office}
        scopeLabel={scopeLabel}
        previewName={preview?.name ?? "—"}
        offerDinner={preview?.offerDinner ?? true}
        today={today}
        todayWeekday={weekdayOf(today)}
        weekly={weekly.map((w) => ({ id: w.id, weekday: w.weekday ?? 0, slot: w.slot, title: w.title, description: w.description, price: w.price, imageUrl: w.imageUrl }))}
        live={liveLists.flat().map((o) => ({ id: o.id, slot: o.slot, title: o.title, price: o.price, imageUrl: o.imageUrl, stockedOut: o.stockedOut, office: o.office }))}
        saved={saved.map((m) => ({ id: m.id, title: m.title, description: m.description, price: m.price, imageUrl: m.imageUrl }))}
        archived={archived.map((m) => ({ id: m.id, title: m.title, description: m.description, price: m.price, imageUrl: m.imageUrl }))}
      />
    </div>
  );
}
