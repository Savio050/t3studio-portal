import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function Login() {
  const router = useRouter();
  const { error } = router.query;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    getSession().then(s => { if (s) router.replace('/dashboard'); });
  }, [router]);

  // Show auth errors from NextAuth (e.g. wrong credentials)
  useEffect(() => {
    if (error === 'CredentialsSignin') setErr('Email ou senha incorretos.');
  }, [error]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!email.trim() || !password) { setErr('Preencha todos os campos.'); return; }
    setLoading(true);
    const res = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      router.replace('/dashboard');
    } else {
      setErr('Email ou senha incorretos.');
    }
  }

  return (
    <>
      <Head>
        <title>T3 Studio · Entrar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
        <div className="w-full max-w-[360px]">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 mb-4 relative">
              <Image src="/favicon.png" alt="T3 Studio" fill className="object-contain" />
            </div>
            <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">T3 Studio</h1>
            <p className="text-[14px] text-[#6e6e73] mt-0.5">CRM Interno</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[rgba(0,0,0,0.06)] px-6 py-7">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="nome@t3studio.com.br"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErr(''); }}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                    text-[14px] text-[#1d1d1f] placeholder-[#b0b0b8]
                    bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                    focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.18)]
                    transition-all duration-150"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErr(''); }}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.12)]
                    text-[14px] text-[#1d1d1f] placeholder-[#b0b0b8]
                    bg-[#fafafa] focus:bg-white focus:border-[#0071e3]
                    focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.18)]
                    transition-all duration-150"
                />
              </div>

              {err && (
                <p className="text-[13px] text-[#ff3b30] bg-[#fff1f0] rounded-[8px] px-3 py-2">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-[10px] text-[14px] font-semibold text-white
                  transition-all duration-150 active:scale-[0.98] mt-2
                  disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: loading ? '#555' : 'linear-gradient(135deg,#0a84ff,#0055d4)' }}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-[12px] text-[#aeaeb2] mt-6">
            Acesso restrito à equipe T3 Studio
          </p>
        </div>
      </div>
    </>
  );
}
