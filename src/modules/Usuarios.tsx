import { useEffect, useState } from "react";
import { usePlatform } from "../platform/platformStore";
import { ROLE_LABEL, ROLE_DESC } from "../platform/roles";
import { Card, Button, Input, Select, Modal, Badge, EmptyState, SectionTitle } from "../components/ui";
import { PlusIcon, TrashIcon } from "../components/icons";
import type { Member, Role } from "../platform/types";

const roleOptions = [
  { value: "vendedor", label: "Vendedor (solo vender)" },
  { value: "admin", label: "Administrador (compras, productos, salarios…)" },
];

export function Usuarios() {
  const { backend, listMembers, createUser, setMemberRole, setMemberActive, removeMember } = usePlatform();
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    setMembers(await listMembers());
    setLoading(false);
  }
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle
          title="Equipo del negocio"
          subtitle="Crea cuentas para tus vendedores y administradores. Cada uno entra con su propio correo y contraseña."
          action={<Button onClick={() => setOpen(true)}><PlusIcon className="h-4 w-4" /> Nuevo usuario</Button>}
        />

        {/* Explicación de roles */}
        <div className="grid gap-3 sm:grid-cols-3">
          <RoleCard role="owner" />
          <RoleCard role="admin" />
          <RoleCard role="vendedor" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-bold text-slate-900">Usuarios</h2></div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Cargando…</div>
        ) : members.length === 0 ? (
          <div className="p-6"><EmptyState title="Aún no hay usuarios" hint="Crea el primer vendedor o administrador." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Correo</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.email}</td>
                    <td className="px-4 py-3">
                      {m.role === "owner" ? (
                        <Badge color="amber">Dueño</Badge>
                      ) : (
                        <select
                          value={m.role}
                          onChange={async (e) => { await setMemberRole(m.id, e.target.value as Role); reload(); }}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.role === "owner" ? (
                        <Badge color="green">Activo</Badge>
                      ) : m.active ? (
                        <Badge color="green">Activo</Badge>
                      ) : (
                        <Badge color="red">Inactivo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.role !== "owner" && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={async () => { await setMemberActive(m.id, !m.active); reload(); }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            {m.active ? "Desactivar" : "Activar"}
                          </button>
                          <button onClick={async () => { await removeMember(m.id); reload(); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!backend && (
        <p className="text-center text-xs text-slate-400">
          Modo demo: los usuarios se guardan localmente. Con el backend conectado, cada uno podrá iniciar sesión desde su propio dispositivo.
        </p>
      )}

      {open && (
        <CreateUserModal
          onClose={() => setOpen(false)}
          onCreate={async (i) => {
            const res = await createUser(i);
            if (res.ok) { setOpen(false); reload(); }
            return res;
          }}
        />
      )}
    </div>
  );
}

function RoleCard({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    owner: "border-amber-200 bg-amber-50",
    admin: "border-sky-200 bg-sky-50",
    vendedor: "border-emerald-200 bg-emerald-50",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[role]}`}>
      <p className="text-sm font-bold text-slate-900">{ROLE_LABEL[role]}</p>
      <p className="mt-1 text-xs text-slate-600">{ROLE_DESC[role]}</p>
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (i: { name: string; email: string; password: string; role: Role }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await onCreate({ name, email, password, role });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
  }

  return (
    <Modal open onClose={onClose} title="Nuevo usuario del equipo">
      <div className="space-y-4">
        <Input label="Nombre" value={name} onChange={setName} />
        <Input label="Correo (con este inicia sesión)" type="email" value={email} onChange={setEmail} />
        <Input label="Contraseña" value={password} onChange={setPassword} placeholder="Mínimo 4 caracteres" />
        <Select label="Rol" value={role} onChange={(v) => setRole(v as Role)} options={roleOptions} />
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{ROLE_DESC[role]}</div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</Button>
      </div>
    </Modal>
  );
}
