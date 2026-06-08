import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from "../components/ui";
import { PlusIcon, TrashIcon, EditIcon } from "../components/icons";
import { cup } from "../lib/format";
import type { Contact } from "../lib/types";

const empty = { name: "", kind: "cliente" as Contact["kind"], phone: "", note: "" };

export function Contactos() {
  const { data, saveContact, deleteContact } = useStore();
  const [tab, setTab] = useState<"cliente" | "proveedor">("cliente");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Contact, "id"> & { id?: string }>(empty);

  const list = data.contacts.filter((c) => c.kind === tab);

  function spent(contactId: string) {
    if (tab === "cliente") {
      return data.sales.filter((s) => s.customerId === contactId).reduce((a, s) => a + s.total, 0);
    }
    return data.purchases.filter((p) => p.supplierId === contactId).reduce((a, p) => a + p.total, 0);
  }
  function count(contactId: string) {
    return tab === "cliente"
      ? data.sales.filter((s) => s.customerId === contactId).length
      : data.purchases.filter((p) => p.supplierId === contactId).length;
  }

  function openNew() {
    setForm({ ...empty, kind: tab });
    setOpen(true);
  }
  function openEdit(c: Contact) {
    setForm(c);
    setOpen(true);
  }
  function submit() {
    if (!form.name.trim()) return;
    saveContact(form);
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button onClick={() => setTab("cliente")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "cliente" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Clientes</button>
          <button onClick={() => setTab("proveedor")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "proveedor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Proveedores</button>
        </div>
        <Button onClick={openNew}><PlusIcon className="h-4 w-4" /> Nuevo {tab}</Button>
      </div>

      {list.length === 0 ? (
        <EmptyState title={`Sin ${tab === "cliente" ? "clientes" : "proveedores"}`} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-600">{c.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.phone || "Sin teléfono"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><EditIcon className="h-4 w-4" /></button>
                  <button onClick={() => deleteContact(c.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
              {c.note ? <p className="mt-2 text-sm text-slate-500">{c.note}</p> : null}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <Badge color={tab === "cliente" ? "green" : "blue"}>{count(c.id)} {tab === "cliente" ? "ventas" : "compras"}</Badge>
                <span className="text-sm font-bold text-slate-900">{cup(spent(c.id))}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar contacto" : "Nuevo contacto"}>
        <div className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Select label="Tipo" value={form.kind} onChange={(v) => setForm({ ...form, kind: v as Contact["kind"] })} options={[{ value: "cliente", label: "Cliente" }, { value: "proveedor", label: "Proveedor" }]} />
          <Input label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Nota" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}
