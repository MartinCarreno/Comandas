// apps/web/src/App.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useState } from 'react';
import { clearTokens, getRefreshToken } from './authStorage';
import './App.css';

type Producto = {
  id: string;
  nombre: string;
  description?: string | null;
  tipo: 'BEBESTIBLE' | 'COMESTIBLE';
  dueDate?: string | null;
};

type AdminProducto= Producto & {
  userId: string;
};

type Me = {
  sub: string;
  email: string;
  role?: 'USER' | 'ADMIN';
};

export default function App({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();

  // --- QUIÉN SOY (JWT /auth/me) ---
  const { data: me, isLoading: meLoading, error: meError } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  // --- TAREAS DEL USUARIO LOGUEADO ---
  const {
    data: productos,
    isLoading: productosLoading,
    error: productosError,
  } = useQuery<Producto[]>({
    queryKey: ['productos'],
    queryFn: async () => (await api.get('/productos')).data,
    enabled: !!me,
  });

  // --- TODAS LAS TAREAS (SOLO ADMIN) ---
  const {
    data: adminProductos,
    isLoading: adminLoading,
    error: adminError,
  } = useQuery<AdminProducto[]>({
    queryKey: ['producto-admin'],
    queryFn: async () => (await api.get('/producto/admin/all')).data,
    enabled: !!me && me.role === 'ADMIN',
  });

  // Estado para CREAR tareas
  const [nombre, setNombre] = useState('');
  const [description, setDescription] = useState('');
  const [tipo, setTipo] = useState<'BEBESTIBLE' | 'COMESTIBLE'>('BEBESTIBLE');
  const [dueDate, setDueDate] = useState('');

  // Estado para EDITAR tareas del usuario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingTipo, setEditingTipo] = useState<'BEBESTIBLE' | 'COMESTIBLE'>('BEBESTIBLE');
  const [editingDueDate, setEditingDueDate] = useState('');

  const create = useMutation({
    mutationFn: async () =>
      api.post('/productos', {
        nombre: nombre.trim(),
        description: description.trim() || undefined,
        tipo,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      setNombre('');
      setDescription('');
      setTipo('BEBESTIBLE');
      setDueDate('');
      qc.invalidateQueries({ queryKey: ['productos'] });
      qc.invalidateQueries({ queryKey: ['productos-admin'] });
    },
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      nombre: string;
      description?: string;
      tipo: 'BEBESTIBLE' | 'COMESTIBLE';
      dueDate?: string;
    }) =>
      api.patch(`/productos/${input.id}`, {
        nombre: input.nombre,
        description: input.description,
        tipo: input.tipo,
        dueDate: input.dueDate,
      }),
    onSuccess: () => {
      setEditingId(null);
      setEditingNombre('');
      setEditingDescription('');
      setEditingTipo('BEBESTIBLE');
      setEditingDueDate('');
      qc.invalidateQueries({ queryKey: ['productos'] });
      qc.invalidateQueries({ queryKey: ['productos-admin'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/productos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      qc.invalidateQueries({ queryKey: ['productos-admin'] });
    },
  });

  const handleLogoutClick = async () => {
    try {
      const refreshToken = getRefreshToken();
      await api.post('/auth/logout', { refresh_token: refreshToken ?? '' });
    } catch {
      // ignoramos errores de logout
    } finally {
      clearTokens();
      onLogout();
    }
  };

  const startEdit = (producto: Producto) => {
    setEditingId(producto.id);
    setEditingNombre(producto.nombre);
    setEditingDescription(producto.description ?? '');
    setEditingTipo(producto.tipo);
    setEditingDueDate(producto.dueDate ? producto.dueDate.slice(0, 10) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNombre('');
    setEditingDescription('');
    setEditingTipo('BEBESTIBLE');
    setEditingDueDate('');
  };

  const saveEdit = (id: string) => {
    if (!editingNombre.trim()) return;
    update.mutate({
      id,
      nombre: editingNombre.trim(),
      description: editingDescription.trim() || undefined,
      tipo: editingTipo,
      dueDate: editingDueDate || undefined,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    create.mutate();
  };

  // --- ESTADOS GLOBALES BÁSICOS ---
  if (meLoading) return <p>Cargando sesión...</p>;
  if (meError) return <p>Error cargando usuario. Vuelve a iniciar sesión.</p>;

  if (productosLoading) return <p>Cargando Productos...</p>;
  if (productosError) return <p>Error cargando Productos.</p>;

  return (
    <div className="app-shell app-shell--dashboard">
      <div className="dashboard-layout">
        {/* HEADER */}
        <section className="card">
          <header className="app-header">
            <div>
              <h1 className="app-title">Comandas</h1>
              <p className="app-subtitle">
                Ten tus Comandas y productos para gestionar tu restaurant.
              </p>
              {me && (
                <p className="user-info">
                  Sesión: <strong>{me.email}</strong>
                  {me.role && (
                    <span
                      className={
                        me.role === 'ADMIN' ? 'badge-role admin' : 'badge-role'
                      }
                    >
                      {me.role}
                    </span>
                  )}
                </p>
              )}
            </div>
            <button className="btn btn-secondary" onClick={handleLogoutClick}>
              Cerrar sesión
            </button>
          </header>
        </section>

        {/* MAIN: 2 COLUMNAS */}
        <div className="dashboard-main">
          {/* PANEL IZQUIERDO: NUEVO PRODUCTO */}
          <section className="card">
            <h2 className="section-title">Nuevo Producto</h2>
            <form className="form" onSubmit={handleCreateSubmit}>
              <div className="field">
                <label className="field-label">Nombre</label>
                <input
                  className="input"
                  placeholder="Escribe el nombre del producto…"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label">Descripción</label>
                <textarea
                  className="textarea"
                  placeholder="Detalle opcional del producto"
                  value={description}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="producto-edit-row">
                <div className="field">
                  <label className="field-label">Tipo</label>
                  <select
                    className="input"
                    value={tipo}
                    onChange={(e) =>
                      setTipo(e.target.value as 'BEBESTIBLE' | 'COMESTIBLE')
                    }
                  >
                    <option value="BEBESTIBLE">Bebestible</option>
                    <option value="COMESTIBLE">Comestible</option>
                    
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Fecha Vencimiento</label>
                  <input
                    className="input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!nombre.trim() || create.isPending}
                >
                  {create.isPending ? 'Creando…' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </section>

          {/* PANEL DERECHO: TUS PRODUCTOS */}
          <section className="card">
            <h2 className="section-title" style={{ marginBottom: 8 }}>
              Tus Productos
            </h2>
            <ul className="productos-list">
              {productos?.map((t) => {
                const isEditing = editingId === t.id;

                return (
                  <li key={t.id} className="producto-item">
                    <div className="producto-main">
                      {isEditing ? (
                        <div className="producto-edit">
                          <div className="field">
                            <label className="field-label">Nombre</label>
                            <input
                              className="input"
                              value={editingNombre}
                              onChange={(e) => setEditingNombre(e.target.value)}
                            />
                          </div>

                          <div className="field">
                            <label className="field-label">Descripción</label>
                            <textarea
                              className="textarea"
                              rows={2}
                              value={editingDescription}
                              onChange={(e) =>
                                setEditingDescription(e.target.value)
                              }
                            />
                          </div>

                          <div className="producto-edit-row">
                            <div className="field">
                              <label className="field-label">Prioridad</label>
                              <select
                                className="input"
                                value={editingTipo}
                                onChange={(e) =>
                                  setEditingTipo(
                                    e.target.value as 'COMESTIBLE' | 'BEBESTIBLE',
                                  )
                                }
                              >
                                <option value="COMESTIBLE">Comestible</option>
                                <option value="BEBESTIBLE">Bebestible</option>

                              </select>
                            </div>
                            <div className="field">
                              <label className="field-label">Fecha límite</label>
                              <input
                                className="input"
                                type="date"
                                value={editingDueDate}
                                onChange={(e) =>
                                  setEditingDueDate(e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <p className="producto-meta">Editando producto..</p>
                        </div>
                      ) : (
                        <>
                          <p className="producto-title">{t.nombre}</p>
                          {t.description && (
                            <p className="producto-description">{t.description}</p>
                          )}
                          <p className="producto-meta">
                            Tipo: {t.tipo}{' '}
                            {t.dueDate
                              ? `· vence el ${new Date(
                                  t.dueDate,
                                ).toLocaleDateString()}`
                              : ''}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="producto-actions">
                      {isEditing ? (
                        <>
                          <button
                            className="btn btn-primary"
                            type="button"
                            disabled={update.isPending}
                            onClick={() => saveEdit(t.id)}
                          >
                            Guardar
                          </button>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={cancelEdit}
                            disabled={update.isPending}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => startEdit(t)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(t.id)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* PANEL EXTRA: TODOS LOS PRODUCTOS (SOLO ADMIN, SOLO LECTURA) */}
        {me?.role === 'ADMIN' && (
          <section className="card">
            <h2 className="section-title" style={{ marginBottom: 8 }}>
              Todas las tareas (ADMIN)
            </h2>
            <p className="app-subtitle" style={{ marginTop: 0, marginBottom: 8 }}>
              Vista global de tareas de todos los usuarios (solo lectura).
            </p>

            {adminLoading && <p>Cargando tareas globales…</p>}
            {adminError && (
              <p style={{ color: '#fecaca' }}>Error cargando tareas globales.</p>
            )}

            {!adminLoading && !adminError && (
              <ul className="productos-list">
                {adminProductos?.map((t) => (
                  <li key={t.id} className="producto-item">
                    <div className="producto-main">
                      <p className="producto-title">{t.nombre}</p>
                      {t.description && (
                        <p className="producto-description">{t.description}</p>
                      )}
                      <p className="producto-meta">
                        Usuario ID: {t.userId} · Tipo: {t.tipo}{' '}
                        {t.dueDate
                          ? `· vence el ${new Date(
                              t.dueDate,
                            ).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
