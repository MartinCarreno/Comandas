import { useState } from 'react';
import { type Producto, type Mesa, type Comanda } from '../App';

type Props = {
    mesas: Mesa[];
    productos: Producto[];
    comandas: Comanda[];
    userRole?: 'USER' | 'ADMIN';
    onCrearComanda: (mesa: Mesa, items: { producto: Producto; cantidad: number }[]) => void;
    onEditarComanda: (comandaId: string, detalles: { productoId: string; cantidad: number }[]) => void;
    onCobrarMesa: (mesa: Mesa) => void;
};

export function MesaDashboard({ mesas, productos, comandas, onCrearComanda, onEditarComanda, onCobrarMesa }: Props) {
    const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<{ [id: string]: number }>({});
    const [modalStep, setModalStep] = useState<'acciones' | 'comanda' | 'cobro' | 'editar'>('acciones');
    const [editingItems, setEditingItems] = useState<{ [id: string]: number }>({});

    const openModal = (mesa: Mesa) => {
        setSelectedMesa(mesa);
        setSelectedItems({});
        setModalStep('acciones');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedMesa(null);
        setSelectedItems({});
        setModalStep('acciones');
    };

    const handleCantidadChange = (productoId: string, cantidad: number) => {
        setSelectedItems((prev) => ({
            ...prev,
            [productoId]: cantidad,
        }));
    };

    const handleCrear = () => {
        if (!selectedMesa) return;
        const items = Object.entries(selectedItems)
            .filter(([_, cantidad]) => cantidad > 0)
            .map(([productoId, cantidad]) => ({
                producto: productos.find((p) => p.id === productoId)!,
                cantidad,
            }));
        if (items.length > 0) {
            onCrearComanda(selectedMesa, items);
            closeModal();
        }
    };

    const handleCobrar = () => {
        if (!selectedMesa) return;
        onCobrarMesa(selectedMesa);
        closeModal();
    };

    const handleEditarChange = (productoId: string, cantidad: number) => {
        setEditingItems((prev) => ({
            ...prev,
            [productoId]: cantidad,
        }));
    };

    const handleEditarGuardar = () => {
        if (!comandaActiva) return;
        const items = Object.entries(editingItems)
            .filter(([_, cantidad]) => cantidad > 0)
            .map(([productoId, cantidad]) => ({
                productoId,
                cantidad,
            }));
        if (items.length > 0) {
            onEditarComanda(comandaActiva.id, items);
            closeModal();
        }
    };

    // Cuando se entra a editar, precarga los productos actuales
    const startEditarComanda = () => {
        if (!comandaActiva) return;
        const items: { [id: string]: number } = {};
        comandaActiva.detalles.forEach((d: any) => {
            items[d.productoId] = d.cantidad;
        });
        setEditingItems(items);
        setModalStep('editar');
    };

    // Busca la última comanda de la mesa seleccionada
    const ultimaComanda = selectedMesa
        ? comandas
            .filter((c) => c.mesaId === selectedMesa.id)
            .sort((a, b) => (a.id < b.id ? 1 : -1))[0]
        : null;

    // Encuentra la última comanda activa de la mesa seleccionada
    const comandaActiva = selectedMesa
        ? comandas
            .filter((c) => c.mesaId === selectedMesa.id && c.estado !== 'PAGADO')
            .sort((a, b) => (a.id < b.id ? 1 : -1))[0]
        : null;

    return (
        <section className="card">
            <h2 className="section-title">Mesas</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {mesas.map((mesa) => (
                    <div
                        key={mesa.id}
                        className="mesa-card"
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: 8,
                            padding: 16,
                            minWidth: 120,
                            cursor: 'pointer',
                            background: mesa.usada ? '#ffdddd' : '#fafafa',
                            color: mesa.usada ? '#b00' : 'inherit',
                            opacity: mesa.usada ? 0.8 : 1,
                        }}
                        onClick={() => openModal(mesa)}
                    >
                        <div>
                            <strong>Mesa {mesa.numeroMesa}</strong>
                            {mesa.usada && (
                                <span style={{ marginLeft: 8, color: '#b00', fontWeight: 'bold' }}>
                                    (Usada)
                                </span>
                            )}
                        </div>
                        <div>Capacidad: {mesa.capacidad ?? '-'}</div>
                        <div>
                            Pos: ({mesa.posX}, {mesa.posY})
                        </div>
                    </div>
                ))}
            </div>

            {modalOpen && selectedMesa && (
                <div className="modal-backdrop" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal" style={{
                        background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 400, boxShadow: '0 2px 16px #0002'
                    }}>
                        {modalStep === 'acciones' && (
                            <>
                                <h3>Acciones para Mesa {selectedMesa.numeroMesa}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                    {!selectedMesa.usada && (
                                        <button className="btn btn-primary" onClick={() => setModalStep('comanda')}>
                                            Crear Comanda
                                        </button>
                                    )}
                                    {selectedMesa.usada && (
                                        <>
                                            <button className="btn btn-warning" onClick={startEditarComanda}>
                                                Editar Comanda
                                            </button>
                                            <button className="btn btn-success" onClick={() => setModalStep('cobro')}>
                                                Cobrar y Liberar Mesa
                                            </button>
                                        </>
                                    )}
                                    <button className="btn btn-secondary" onClick={closeModal}>
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                        {modalStep === 'comanda' && (
                            <>
                                <h3>Crear Comanda para Mesa {selectedMesa.numeroMesa}</h3>
                                <div>
                                    {productos.map((producto) => (
                                        <div key={producto.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ flex: 1 }}>{producto.nombre} (${producto.precio})</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={selectedItems[producto.id] || 0}
                                                onChange={(e) => handleCantidadChange(producto.id, Number(e.target.value))}
                                                style={{ width: 60, marginLeft: 8 }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleCrear} disabled={Object.values(selectedItems).every((v) => !v)}>
                                        Crear Comanda
                                    </button>
                                </div>
                            </>
                        )}

                        {modalStep === 'editar' && comandaActiva && (
                            <>
                                <h3>Editar Comanda Mesa {selectedMesa.numeroMesa}</h3>
                                <div>
                                    {productos.map((producto) => (
                                        <div key={producto.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ flex: 1 }}>{producto.nombre} (${producto.precio})</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={editingItems[producto.id] || 0}
                                                onChange={(e) => handleEditarChange(producto.id, Number(e.target.value))}
                                                style={{ width: 60, marginLeft: 8 }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleEditarGuardar}>
                                        Guardar Cambios
                                    </button>
                                </div>
                            </>
                        )}

                        {modalStep === 'cobro' && (
                            <>
                                <h3>Cobrar Mesa {selectedMesa.numeroMesa}</h3>
                                {ultimaComanda ? (
                                    <div style={{ marginBottom: 16 }}>
                                        <div><strong>Total a cobrar:</strong> ${ultimaComanda.total.toFixed(2)}</div>
                                        <div>Estado: {ultimaComanda.estado}</div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: 16 }}>
                                        <em>No se encontró comanda activa para esta mesa.</em>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                    <button className="btn btn-success" onClick={handleCobrar}>
                                        Cobrar y Liberar Mesa
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}