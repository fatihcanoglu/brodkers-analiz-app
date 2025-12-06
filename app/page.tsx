"use client";
import { useState, useEffect, FormEvent } from 'react';
import { LineChart, Line, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('THYAO');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://127.0.0.1:5328/api/analyze?symbol=${activeSymbol}`)
      .then((res) => {
        if (!res.ok) throw new Error('Veri alınamadı.');
        return res.json();
      })
      .then((incomingData) => {
        if(incomingData.error) throw new Error(incomingData.error);
        setData(incomingData);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || "Hata");
        setLoading(false);
      });
  }, [activeSymbol]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) setActiveSymbol(searchText.toUpperCase().trim());
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white animate-pulse">Analiz Yapılıyor...</div>;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-10 px-4 font-sans">
      <form onSubmit={handleSearch} className="mb-8 flex gap-2 w-full max-w-md">
        <input 
          type="text" 
          placeholder="Hisse Kodu (Örn: EREGL)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="bg-slate-800 text-white px-4 py-3 rounded-l-lg w-full border border-slate-700 outline-none focus:border-blue-500"
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-r-lg font-bold transition">ARA</button>
      </form>

      {error && <div className="text-red-400 mb-4 bg-red-900/20 p-3 rounded border border-red-800">{error}</div>}

      {data && !error && (
        <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-2xl border border-slate-700">
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-black text-white">{data.symbol}</h1>
              <p className="text-slate-400 text-sm truncate max-w-[200px]">{data.irket_adi}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${
              data.renk === 'green' ? 'bg-green-500/10 border-green-500 text-green-400' : 
              data.renk === 'red' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
            }`}>
              <span className="block text-xs font-bold uppercase opacity-70">Skor</span>
              <span className="text-3xl font-black">{data.puan}</span>
            </div>
          </div>

          <div className="text-6xl font-bold text-white mb-8 tracking-tighter">₺{data.fiyat}</div>

          {/* Graham Kartı */}
          <div className="bg-slate-700/30 rounded-xl p-4 mb-8 border border-slate-600/30">
            <div className="flex justify-between items-center border-b border-slate-600/30 pb-2 mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-widest">GRAHAM DEĞERİ</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                    data.analiz.graham_durum.includes('UCUZ') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>{data.analiz.graham_durum}</span>
            </div>
            <div className="flex items-end gap-2">
                 <p className="text-3xl font-bold text-white">₺{data.analiz.graham}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Box title="RSI" value={data.analiz.rsi} />
            <Box title="F/K" value={data.analiz.fk} />
            <Box title="PD/DD" value={data.analiz.pd_dd} />
          </div>

          <div className="h-64 w-full bg-slate-900/50 rounded-lg p-2 border border-slate-700/50 relative mb-8">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={data.grafik_data}>
                 <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px'}} 
                    itemStyle={{color: '#fff'}}
                    labelStyle={{display:'none'}}
                 />
                 <Legend verticalAlign="top" height={36}/>
                 <Line name="Fiyat" type="monotone" dataKey="fiyat" stroke={data.renk === 'green'?'#4ade80':data.renk==='red'?'#f87171':'#facc15'} strokeWidth={3} dot={false} />
                 <Line name="SMA 50" type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                 <Line name="SMA 200" type="monotone" dataKey="sma200" stroke="#f97316" strokeWidth={2} dot={false} />
               </LineChart>
             </ResponsiveContainer>
          </div>

          {/* Yapay Zeka Kutusu */}
          <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 p-5 rounded-xl border border-blue-500/30 relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
             <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                Yapay Zeka Analisti
             </h3>
             <p className="text-slate-200 text-sm leading-relaxed">
                {data.analiz.ai_yorum}
             </p>
          </div>
          
          {/* --- BURASI YENİ EKLENEN KISIM (SAAT) --- */}
          <div className="mt-6 text-center">
             <p className="text-[10px] text-slate-400">Veri Güncelleme: {data.guncelleme_saati}</p>
             <p className="text-[10px] text-slate-600 mt-1">Yasal Uyarı: Bu veriler gecikmeli olabilir ve yatırım tavsiyesi değildir.</p>
          </div>
          
        </div>
      )}
    </div>
  );
}

function Box({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-slate-700/40 p-3 rounded-lg border border-slate-600/30">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className="text-xl text-white font-bold">{value}</p>
    </div>
  );
}