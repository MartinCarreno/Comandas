// apps/web/src/App.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useState } from 'react';
import { clearTokens, getRefreshToken } from './authStorage';
import { MesaDashboard } from './components/MesaDashboard';

import './App.css';

export type Producto = {
  id: string;
  nombre: string;
  description?: string | null;
  tipo: 'BEBESTIBLE' | 'COMESTIBLE';
  precio: number; // Agregado precio
  dueDate?: string | null;
  activo: boolean;
};

export type Mesa = {
  id: string;
  numeroMesa: number;
  capacidad?: number;
  usada: boolean;
  posX: number;
  posY: number;
};

// Si necesitas mostrar historial de comandas luego, usaremos este type
export type Comanda = {
  id: string;
  mesaId: string;
  estado: 'PENDIENTE' | 'EN_PREPARACION' | 'ENTREGADO' | 'PAGADO';
  total: number;
  detalles: any[]; // Se puede detallar más si es necesario
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



  // Estado para CREAR productos
  const [nombre, setNombre] = useState('');
  const [description, setDescription] = useState('');
  const [tipo, setTipo] = useState<'BEBESTIBLE' | 'COMESTIBLE'>('BEBESTIBLE');
  const [dueDate, setDueDate] = useState('');
  const [precio, setPrecio] = useState(0);

  // Estado para EDITAR productos del usuario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingTipo, setEditingTipo] = useState<'BEBESTIBLE' | 'COMESTIBLE'>('BEBESTIBLE');
  const [editingDueDate, setEditingDueDate] = useState('');
  const [editingPrecio, setEditingPrecio] = useState(0);

  const create = useMutation({
    mutationFn: async () =>
      api.post('/productos', {
        nombre: nombre.trim(),
        description: description.trim() || undefined,
        tipo,
        dueDate: dueDate || undefined,
        precio: precio || 0,
      }),
    onSuccess: () => {
      setNombre('');
      setDescription('');
      setTipo('BEBESTIBLE');
      setDueDate('');
      setPrecio(0);
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
      precio?: number;
    }) =>
      api.patch(`/productos/${input.id}`, {
        nombre: input.nombre,
        description: input.description,
        tipo: input.tipo,
        dueDate: input.dueDate,
        precio: input.precio,
      }),
    onSuccess: () => {
      setEditingId(null);
      setEditingNombre('');
      setEditingDescription('');
      setEditingTipo('BEBESTIBLE');
      setEditingDueDate('');
      setEditingPrecio(0);
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
    setEditingPrecio(producto.precio || 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNombre('');
    setEditingDescription('');
    setEditingTipo('BEBESTIBLE');
    setEditingDueDate('');
    setEditingPrecio(0);
  };

  const saveEdit = (id: string) => {
    if (!editingNombre.trim()) return;
    update.mutate({
      id,
      nombre: editingNombre.trim(),
      description: editingDescription.trim() || undefined,
      tipo: editingTipo,
      dueDate: editingDueDate || undefined,
      precio: editingPrecio || 0,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    create.mutate();
  };

  const {
    data: mesas,
    isLoading: mesasLoading,
    error: mesasError,
  } = useQuery<Mesa[]>({
    queryKey: ['mesas'],
    queryFn: async () => (await api.get('/mesas')).data,
    enabled: !!me,
  });

  const { data: comandas, isLoading: comandasLoading } = useQuery<Comanda[]>({
    queryKey: ['comandas'],
    queryFn: async () => (await api.get('/comandas')).data,
    enabled: !!me,
  });

  const crearComanda = useMutation({
    mutationFn: async ({
      mesaId,
      detalles,
    }: {
      mesaId: string;
      detalles: { productoId: string; cantidad: number }[];
    }) =>
      api.post('/comandas', {
        mesaId,
        detalles,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comandas'] });
      qc.invalidateQueries({ queryKey: ['mesas'] }); // <-- Agrega esto
    },
  });

  const editarComanda = useMutation({
    mutationFn: async ({ comandaId, detalles }: { comandaId: string; detalles: { productoId: string; cantidad: number }[] }) =>
      api.patch(`/comandas/${comandaId}`, { detalles }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comandas'] });
      qc.invalidateQueries({ queryKey: ['mesas'] });
    },
  });

  const cobrarMesa = useMutation({
    mutationFn: async (mesaId: string) =>
      api.patch(`/mesas/${mesaId}/liberar`, { usada: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesas'] });
      // Puedes invalidar otras queries si lo necesitas
    },
  });



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
          {/* PANEL MESAS DASHBOARD */}
          {mesasLoading ? (
            <p>Cargando mesas...</p>
          ) : mesasError ? (
            <p>Error cargando mesas</p>
          ) : mesas ? (
            <MesaDashboard
              mesas={mesas}
              productos={productos || []}
              comandas={comandas || []}
              userRole={me?.role}
              onEditarComanda={(comandaId, detalles) => editarComanda.mutate({ comandaId, detalles })}
              onCrearComanda={(mesa, items) => {
                crearComanda.mutate({
                  mesaId: mesa.id,
                  detalles: items.map((i) => ({
                    productoId: i.producto.id,
                    cantidad: i.cantidad,
                  })),
                });
              }}
              onCobrarMesa={(mesa) => {
                cobrarMesa.mutate(mesa.id);
              }}
            />
          ) : null}

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
                              <label className="field-label">Fecha Cambio</label>
                              <input
                                className="input"
                                type="date"
                                value={editingDueDate}
                                onChange={(e) =>
                                  setEditingDueDate(e.target.value)
                                }
                              />
                            </div>
                            <div className="field">
                              <label className="field-label">Precio</label>
                              <input
                                min="0"
                                className="input"
                                type="number"
                                value={editingPrecio}
                                onChange={(e) =>
                                  setEditingPrecio(Number(e.target.value))
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
                              ? `· creado ${new Date(
                                t.dueDate,
                              ).toLocaleDateString()}`
                              : ''}{' · '}
                            Precio: ${t.precio}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="producto-actions">
                      {me?.role === 'ADMIN' && ( // Solo admin puede editar/eliminar
                        isEditing ? (
                          <>
                            <button className="btn btn-primary" type="button" disabled={update.isPending} onClick={() => saveEdit(t.id)}>
                              Guardar
                            </button>
                            <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={update.isPending}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-secondary" type="button" onClick={() => startEdit(t)}>
                              Editar
                            </button>
                            <button className="btn btn-danger" type="button" disabled={remove.isPending} onClick={() => remove.mutate(t.id)}>
                              Eliminar
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* PANEL IZQUIERDO: NUEVO PRODUCTO */}
          {me?.role === 'ADMIN' && (
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
                    <label className="field-label">Fecha Creacion</label>
                    <input
                      className="input"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Precio</label>
                    <input
                      min="0"
                      className="input"
                      type="number"
                      value={precio}
                      onChange={(e) => setPrecio(Number(e.target.value))}
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
          )}



        </div>


      </div>
    </div>
  );
}
