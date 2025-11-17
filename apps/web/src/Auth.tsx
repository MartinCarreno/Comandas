import { useState } from 'react';
import { api } from './api';

export default function Auth({ onLogged }: { onLogged: () => void }) {
    const [email, setEmail] = useState('test@example.com');
    const [password, setPassword] = useState('secret12');
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setErr(null);
        try {
            const url = mode === 'login' ? '/auth/login' : '/auth/signup';
            const { data } = await api.post(url, { email, password });
            localStorage.setItem('token', data.access_token);
            onLogged();
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? 'Error');
        } finally { setLoading(false); }
    };
    return (
        <form onSubmit={submit} style={{
            maxWidth: 360, margin: '4rem auto'
        }}>
            <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" style={{ display: 'block', width: '100%', padding: 8, margin: '6px0' }} />
            <input value={password} onChange={e => setPassword(e.target.value)}
                placeholder="password" type="password" style={{ display: 'block', width: '100%', padding: 8, margin: '6px 0' }} />
            {err && <p style={{ color: 'crimson' }}>{err}</p>}
            <button disabled={loading} type="submit">{loading ? '...' : 'Enviar'}</button>
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ marginLeft: 8 }}>
                {mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}
            </button>
        </form>
    );
}