import { useQuery, useMutation, useQueryClient  } from "@tanstack/react-query";
import { api } from './api';
import { useState } from 'react';

type Producto = {
  id: string;
  nombre: string; 
  description?: string;
  tipo: 'BEBESTIBLE' | 'COMESTIBLE';
  dueDate?: string | null;    
} 

export default function App() {
  const qc = useQueryClient();
  const { data: productos, isLoading, error } = useQuery<Producto[]>({
    queryKey: ['productos'],
    queryFn: async () => (await api.get('/productos')).data,
  });
  const [nombre, setNombre] = useState('');
  const create = useMutation({
    mutationFn: async () => api.post('/productos', { nombre }),
    onSuccess: () => {
      setNombre(''); qc.invalidateQueries({
        queryKey: ['productos']
      });
    }
  });
  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error cargando tareas</p>;

  return (
    <main style={{
      maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui'
    }}>
      <h1>Comandas</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) create.mutate(); }}>
        <input
          placeholder="Nuevo Producto..."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ padding: 8, width: '70%' }}
        />

        

        <button type="submit" style={{ padding: 8, marginLeft: 8 }}>Crear</button>
      </form>
      <ul>
        {productos?.map(t => (
          <li key={t.id} style={{ padding: 8, borderBottom: '1px solid #ddd' }}>
            <strong>{t.nombre}</strong>
          </li>
        ))}
      </ul>
    </ main>
  );
}