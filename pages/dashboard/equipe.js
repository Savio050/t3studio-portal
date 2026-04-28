import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import CRMLayout from '../../components/crm/Layout';
import { Shield, User, Mail, Loader2, Users2 } from 'lucide-react';
import Image from 'next/image';

const AVATAR_GRADIENTS = [
  ['#0a84ff', '#0055d4'],
  ['#30d158', '#248a3d'],
  ['#bf5af2', '#6e3aad'],
  ['#ff9f0a', '#c93400'],
  ['#ff375f', '#c0002a'],
  ['#64d2ff', '#0071a4'],
];

function gradientFor(id) {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function getInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function RoleBadge({ cargo }) {
  const isAdmin = cargo === 'administrador';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
      ${isAdmin
        ? 'bg-[rgba(0,113,227,0.10)] text-[#0071e3]'
        : 'bg-[rgba(0,0,0,0.05)] text-[#6e6e73]'}`}>
      {isAdmin
        ? <Shield className="w-3 h-3" />
        : <User   className="w-3 h-3" />}
      {isAdmin ? 'Administrador' : 'Participante'}
    </span>
  );
}

function MemberCard({ member, isCurrentUser }) {
  const [imgErr, setImgErr] = useState(false);
  const showPhoto = member.foto && !imgErr;

  return (
    <div className={`relative group flex flex-col items-center text-center
      bg-white rounded-2xl border p-6 pt-8
      transition-all duration-300 ease-out
      hover:shadow-lg hover:-translate-y-0.5
      ${isCurrentUser
        ? 'border-[#0071e3]/30 shadow-[0_0_0_2px_rgba(0,113,227,0.12)]'
        : 'border-[rgba(0,0,0,0.06)] shadow-sm'}`}>

      {/* "Você" badge */}
      {isCurrentUser && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5
          rounded-full bg-[rgba(0,113,227,0.10)] text-[#0071e3] tracking-wide">
          Você
        </span>
      )}

      {/* Avatar */}
      <div className="relative w-24 h-24 mb-5">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-md">
          {showPhoto ? (
            <Image
              src={member.foto}
              alt={member.nome}
              width={96} height={96}
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center
              text-[26px] font-bold text-white"
              style={{ background: gradientFor(member.id) }}>
              {getInitials(member.nome)}
            </div>
          )}
        </div>

        {/* Online dot — purely decorative */}
        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full
          bg-[#30d158] ring-2 ring-white" />
      </div>

      {/* Name */}
      <h3 className="text-[17px] font-bold text-[#1d1d1f] tracking-tight mb-1">
        {member.nome}
      </h3>

      {/* Role */}
      <div className="mb-4">
        <RoleBadge cargo={member.cargo} />
      </div>

      {/* Email */}
      <a href={`mailto:${member.email}`}
        className="flex items-center gap-1.5 text-[12px] text-[#aeaeb2]
          hover:text-[#0071e3] transition-colors duration-150">
        <Mail className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[160px]">{member.email}</span>
      </a>
    </div>
  );
}

export default function EquipePage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    fetch('/api/crm/team')
      .then(r => r.json())
      .then(d => {
        if (d.error) setErr(d.error);
        else setMembers(d.members || []);
        setLoading(false);
      })
      .catch(() => { setErr('Erro ao carregar equipe.'); setLoading(false); });
  }, []);

  const admins       = members.filter(m => m.cargo === 'administrador');
  const participants = members.filter(m => m.cargo === 'participante');

  return (
    <CRMLayout title="Equipe · T3 Studio">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0a84ff,#0055d4)' }}>
              <Users2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight leading-none">Nossa Equipe</h1>
              <p className="text-[14px] text-[#6e6e73] mt-0.5">
                {loading ? '…' : `${members.length} ${members.length === 1 ? 'membro' : 'membros'} ativos`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-[#aeaeb2]" />
          </div>
        ) : err ? (
          <div className="p-5 rounded-2xl bg-[#fff1f0] border border-[#ff3b30]/20 text-[14px] text-[#ff3b30]">
            {err}
          </div>
        ) : (
          <div className="space-y-10">

            {/* Admins */}
            {admins.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-[#0071e3]" />
                  <h2 className="text-[13px] font-semibold text-[#6e6e73] uppercase tracking-widest">
                    Administradores
                  </h2>
                </div>
                <div className={`grid gap-4 ${
                  admins.length === 1 ? 'grid-cols-1 max-w-[220px]' :
                  admins.length === 2 ? 'grid-cols-2 sm:grid-cols-2 max-w-[460px]' :
                  'grid-cols-2 sm:grid-cols-3'
                }`}>
                  {admins.map(m => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      isCurrentUser={m.id === session?.user?.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Participants */}
            {participants.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-[#6e6e73]" />
                  <h2 className="text-[13px] font-semibold text-[#6e6e73] uppercase tracking-widest">
                    Equipe
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {participants.map(m => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      isCurrentUser={m.id === session?.user?.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
