import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, NumberInput, SectionTitle } from "../components/ui";
import { InstallButton } from "../platform/InstallButton";
import { BrandName } from "../platform/Brand";

export function Ajustes() {
  const { data, updateBusiness, resetData } = useStore();
  const [name, setName] = useState(data.business.name);
  const [owner, setOwner] = useState(data.business.owner);
  const [taxRate, setTaxRate] = useState(data.business.taxRate);
  const [saved, setSaved] = useState(false);

  function save() {
    updateBusiness({ name, owner, taxRate });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function confirmReset() {
    if (window.confirm("¿Restablecer todos los datos a los valores de ejemplo? Esta acción no se puede deshacer.")) {
      resetData();
      window.location.reload();
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="p-5">
        <SectionTitle title="Instalar la app" subtitle="Tenla como una app en tu teléfono o PC y úsala sin internet" />
        <div className="flex flex-wrap items-center gap-3">
          <InstallButton className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500" />
          <p className="text-sm text-slate-500">Si no ves el botón, es porque ya está instalada o tu navegador no lo permite.</p>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Notificaciones" subtitle="Avisos de turnos cerrados, productos por agotarse y vencimiento de suscripción" />
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-700">Activar notificaciones</span>
          <button
            type="button"
            onClick={() => updateBusiness({ notifications: data.business.notifications === false })}
            className={`relative h-7 w-12 rounded-full transition ${data.business.notifications === false ? "bg-slate-300" : "bg-emerald-500"}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${data.business.notifications === false ? "left-0.5" : "left-[22px]"}`} />
          </button>
        </label>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Datos del negocio" subtitle="Información usada en cálculos e informes" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre del negocio" value={name} onChange={setName} className="sm:col-span-2" />
          <Input label="Propietario" value={owner} onChange={setOwner} />
          <NumberInput label="Impuesto ONAT (%)" min={0} value={taxRate} onChange={setTaxRate} />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={save}>Guardar cambios</Button>
          {saved && <span className="text-sm font-semibold text-emerald-600">✓ Guardado</span>}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Datos y respaldo" subtitle="Todo se guarda localmente en este dispositivo" />
        <p className="text-sm text-slate-600">
          La información de productos, ventas, compras, empleados y contabilidad se almacena en el navegador (localStorage). No se envía a ningún servidor.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Counter label="Productos" value={data.products.length} />
            <Counter label="Ventas" value={data.sales.length} />
            <Counter label="Compras" value={data.purchases.length} />
            <Counter label="Empleados" value={data.employees.length} />
            <Counter label="Gastos" value={data.expenses.length} />
            <Counter label="Contactos" value={data.contacts.length} />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="danger" onClick={confirmReset}>Restablecer datos de ejemplo</Button>
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400"><BrandName accent="text-emerald-500" /> · Gestión para negocios en Cuba · Moneda CUP</p>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
